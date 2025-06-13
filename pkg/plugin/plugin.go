package plugin

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"regexp"
	"sync"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/instancemgmt"
	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
	"github.com/grafana/grafana-plugin-sdk-go/backend/resource/httpadapter"
)

// Rate limiter for API requests
type RateLimiter struct {
	mu       sync.Mutex
	requests map[string][]time.Time
}

func NewRateLimiter() *RateLimiter {
	return &RateLimiter{
		requests: make(map[string][]time.Time),
	}
}

func (rl *RateLimiter) isAllowed(clientID string, maxRequests int, timeWindow time.Duration) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	cutoff := now.Add(-timeWindow)

	// Get existing requests for this client
	requests := rl.requests[clientID]

	// Filter out requests outside the time window
	var validRequests []time.Time
	for _, reqTime := range requests {
		if reqTime.After(cutoff) {
			validRequests = append(validRequests, reqTime)
		}
	}

	// Check if we can add another request
	if len(validRequests) >= maxRequests {
		return false
	}

	// Add current request
	validRequests = append(validRequests, now)
	rl.requests[clientID] = validRequests

	return true
}

func (rl *RateLimiter) reset() {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	rl.requests = make(map[string][]time.Time)
}

// Make sure Datasource implements required interfaces.
var (
	_ backend.CallResourceHandler   = (*Datasource)(nil)
	_ instancemgmt.InstanceDisposer = (*Datasource)(nil)
	
	// Regular expression for validating model names
	modelNameRegex = regexp.MustCompile(`^[a-zA-Z0-9\-\.]+$`)
	
	// Global rate limiter - 10 requests per minute per IP
	globalRateLimiter = NewRateLimiter()
)

// Datasource represents an instance of the plugin.
type Datasource struct{}

// NewDatasource creates a new plugin instance.
func NewDatasource(_ context.Context, _ backend.DataSourceInstanceSettings) (instancemgmt.Instance, error) {
	return &Datasource{}, nil
}

// Dispose here tells plugin SDK that plugin wants to clean up resources when a new instance
// created.
func (ds *Datasource) Dispose() {
	// cleanup
}

// CallResource handles incoming resource calls from frontend
func (ds *Datasource) CallResource(ctx context.Context, req *backend.CallResourceRequest, sender backend.CallResourceResponseSender) error {
	log.DefaultLogger.Info("CallResource called", "url", req.URL, "method", req.Method)

	// Create a new handler for HTTP-like handling
	mux := http.NewServeMux()
	
	// Add your routes
	mux.HandleFunc("/groq-chat", ds.handleGroqChat)
	
	// Use the HTTP adapter
	httpResourceHandler := httpadapter.New(mux)
	return httpResourceHandler.CallResource(ctx, req, sender)
}

// handleGroqChat handles Groq API requests securely with environment variable
func (ds *Datasource) handleGroqChat(w http.ResponseWriter, r *http.Request) {
	// Only allow POST requests
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Validate Content-Type
	contentType := r.Header.Get("Content-Type")
	if contentType != "application/json" {
		http.Error(w, "Invalid Content-Type", http.StatusBadRequest)
		return
	}

	// Rate limiting - use client IP as identifier
	clientIP := r.RemoteAddr
	if forwardedFor := r.Header.Get("X-Forwarded-For"); forwardedFor != "" {
		clientIP = forwardedFor
	}
	
	// Allow 10 requests per minute per IP
	if !globalRateLimiter.isAllowed(clientIP, 10, time.Minute) {
		log.DefaultLogger.Warn("Rate limit exceeded", "client", clientIP)
		http.Error(w, "Too many requests", http.StatusTooManyRequests)
		return
	}

	// Get API key from environment variable
	apiKey := os.Getenv("GROQ_API_KEY")
	if apiKey == "" {
		log.DefaultLogger.Error("API key not configured")
		http.Error(w, "Service configuration error", http.StatusInternalServerError)
		return
	}

	// Limit request body size (1MB)
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)

	// Parse request body
	var reqBody struct {
		Model    string `json:"model"`
		Messages []struct {
			Role    string `json:"role"`
			Content string `json:"content"`
		} `json:"messages"`
	}
	
	if err := json.NewDecoder(r.Body).Decode(&reqBody); err != nil {
		log.DefaultLogger.Error("Failed to decode request body", "error", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate request data
	if len(reqBody.Messages) > 100 { // Limit conversation history
		http.Error(w, "Too many messages in conversation", http.StatusBadRequest)
		return
	}

	// Validate model name (allow only alphanumeric, hyphens, dots)
	if reqBody.Model == "" || len(reqBody.Model) > 50 || !modelNameRegex.MatchString(reqBody.Model) {
		http.Error(w, "Invalid model name", http.StatusBadRequest)
		return
	}

	// Validate each message
	for _, msg := range reqBody.Messages {
		if len(msg.Content) > 10000 { // Match frontend limit
			http.Error(w, "Message content too long", http.StatusBadRequest)
			return
		}
		if msg.Role != "user" && msg.Role != "system" && msg.Role != "assistant" {
			http.Error(w, "Invalid message role", http.StatusBadRequest)
			return
		}
	}

	log.DefaultLogger.Info("Groq API call", "model", reqBody.Model, "messages_count", len(reqBody.Messages))

	// Prepare Groq API request
	groqReqBody, err := json.Marshal(reqBody)
	if err != nil {
		log.DefaultLogger.Error("Failed to marshal request", "error", err)
		http.Error(w, "Failed to prepare request", http.StatusInternalServerError)
		return
	}

	// Create HTTP request to Groq API
	groqReq, err := http.NewRequest("POST", "https://api.groq.com/openai/v1/chat/completions", bytes.NewBuffer(groqReqBody))
	if err != nil {
		log.DefaultLogger.Error("Failed to create Groq request", "error", err)
		http.Error(w, "Failed to create request", http.StatusInternalServerError)
		return
	}

	// Set headers
	groqReq.Header.Set("Content-Type", "application/json")
	groqReq.Header.Set("Authorization", fmt.Sprintf("Bearer %s", apiKey))

	// Make the request with timeout
	client := &http.Client{
		Timeout: 30 * time.Second,
	}
	groqResp, err := client.Do(groqReq)
	if err != nil {
		log.DefaultLogger.Error("Failed to call Groq API", "error", err)
		http.Error(w, "Failed to call Groq API", http.StatusInternalServerError)
		return
	}
	defer groqResp.Body.Close()

	// Read response body
	respBody, err := io.ReadAll(groqResp.Body)
	if err != nil {
		log.DefaultLogger.Error("Failed to read Groq response", "error", err)
		http.Error(w, "Failed to read response", http.StatusInternalServerError)
		return
	}

	// Check if Groq API returned an error
	if groqResp.StatusCode != http.StatusOK {
		log.DefaultLogger.Error("Groq API error", "status", groqResp.StatusCode)
		// Don't expose internal API error details to client
		http.Error(w, "External API error occurred", http.StatusBadGateway)
		return
	}

	// Return the response from Groq API
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(respBody)
	
	log.DefaultLogger.Info("Groq API call successful")
}

