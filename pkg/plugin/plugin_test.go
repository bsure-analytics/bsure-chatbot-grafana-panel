package plugin

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
)

func TestModelNameValidation(t *testing.T) {
	// Set up environment variable for tests
	os.Setenv("GROQ_API_KEY", "test-api-key")
	defer os.Unsetenv("GROQ_API_KEY")
	
	// Reset rate limiter for clean tests
	globalRateLimiter.reset()

	ds := &Datasource{}

	testCases := []struct {
		name          string
		modelName     string
		expectedCode  int
		shouldReject  bool
		description   string
	}{
		{
			name:         "valid alphanumeric model",
			modelName:    "llama-3.3-70b-versatile",
			expectedCode: http.StatusOK,
			shouldReject: false,
			description:  "Standard model name should be accepted",
		},
		{
			name:         "valid model with dots",
			modelName:    "gpt-4.0-turbo",
			expectedCode: http.StatusOK,
			shouldReject: false,
			description:  "Model name with dots should be accepted",
		},
		{
			name:         "valid model with numbers",
			modelName:    "claude3-opus-20240229",
			expectedCode: http.StatusOK,
			shouldReject: false,
			description:  "Model name with numbers should be accepted",
		},
		{
			name:         "empty model name",
			modelName:    "",
			expectedCode: http.StatusBadRequest,
			shouldReject: true,
			description:  "Empty model name should be rejected",
		},
		{
			name:         "model name too long",
			modelName:    strings.Repeat("a", 51),
			expectedCode: http.StatusBadRequest,
			shouldReject: true,
			description:  "Model name over 50 characters should be rejected",
		},
		{
			name:         "model name with spaces",
			modelName:    "invalid model name",
			expectedCode: http.StatusBadRequest,
			shouldReject: true,
			description:  "Model name with spaces should be rejected",
		},
		{
			name:         "model name with special characters",
			modelName:    "model@name!",
			expectedCode: http.StatusBadRequest,
			shouldReject: true,
			description:  "Model name with special characters should be rejected",
		},
		{
			name:         "model name with script injection",
			modelName:    "<script>alert('xss')</script>",
			expectedCode: http.StatusBadRequest,
			shouldReject: true,
			description:  "Model name with script tags should be rejected",
		},
		{
			name:         "model name with sql injection attempt",
			modelName:    "'; DROP TABLE models; --",
			expectedCode: http.StatusBadRequest,
			shouldReject: true,
			description:  "Model name with SQL injection should be rejected",
		},
		{
			name:         "model name with unicode characters",
			modelName:    "model-名前",
			expectedCode: http.StatusBadRequest,
			shouldReject: true,
			description:  "Model name with unicode should be rejected",
		},
		{
			name:         "model name with path traversal",
			modelName:    "../../../etc/passwd",
			expectedCode: http.StatusBadRequest,
			shouldReject: true,
			description:  "Model name with path traversal should be rejected",
		},
		{
			name:         "model name with newlines",
			modelName:    "model\nname",
			expectedCode: http.StatusBadRequest,
			shouldReject: true,
			description:  "Model name with newlines should be rejected",
		},
		{
			name:         "model name at exactly 50 characters",
			modelName:    strings.Repeat("a", 50),
			expectedCode: http.StatusOK,
			shouldReject: false,
			description:  "Model name at exactly 50 characters should be accepted",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Reset rate limiter for each test case
			globalRateLimiter.reset()
			
			// Create request body
			reqBody := map[string]interface{}{
				"model": tc.modelName,
				"messages": []map[string]string{
					{
						"role":    "user",
						"content": "test message",
					},
				},
			}

			body, err := json.Marshal(reqBody)
			if err != nil {
				t.Fatalf("Failed to marshal request body: %v", err)
			}

			// Create HTTP request
			req := httptest.NewRequest("POST", "/groq-chat", bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")

			// Create response recorder
			rr := httptest.NewRecorder()

			// Call the handler
			ds.handleGroqChat(rr, req)

			// Check response
			if tc.shouldReject {
				if rr.Code != tc.expectedCode {
					t.Errorf("Expected status code %d for %s, got %d", tc.expectedCode, tc.description, rr.Code)
				}
				if rr.Code == http.StatusBadRequest && !strings.Contains(rr.Body.String(), "Invalid model name") {
					t.Errorf("Expected 'Invalid model name' error message for %s", tc.description)
				}
			} else {
				// For valid cases, we expect the handler to proceed to make the external API call
				// Since we don't have a real API key and server, we'll get a different error
				// but not the validation error
				if rr.Code == http.StatusBadRequest && strings.Contains(rr.Body.String(), "Invalid model name") {
					t.Errorf("Valid model name %s was incorrectly rejected: %s", tc.modelName, tc.description)
				}
			}
		})
	}
}

func TestMessageValidation(t *testing.T) {
	// Set up environment variable for tests
	os.Setenv("GROQ_API_KEY", "test-api-key")
	defer os.Unsetenv("GROQ_API_KEY")
	
	// Reset rate limiter for clean tests
	globalRateLimiter.reset()

	ds := &Datasource{}

	testCases := []struct {
		name         string
		messages     []map[string]string
		expectedCode int
		shouldReject bool
		description  string
	}{
		{
			name: "valid messages",
			messages: []map[string]string{
				{"role": "user", "content": "Hello"},
				{"role": "assistant", "content": "Hi there"},
			},
			expectedCode: http.StatusOK,
			shouldReject: false,
			description:  "Valid messages should be accepted",
		},
		{
			name: "too many messages",
			messages: func() []map[string]string {
				msgs := make([]map[string]string, 101)
				for i := 0; i < 101; i++ {
					msgs[i] = map[string]string{"role": "user", "content": "test"}
				}
				return msgs
			}(),
			expectedCode: http.StatusBadRequest,
			shouldReject: true,
			description:  "More than 100 messages should be rejected",
		},
		{
			name: "message content too long",
			messages: []map[string]string{
				{"role": "user", "content": strings.Repeat("a", 10001)},
			},
			expectedCode: http.StatusBadRequest,
			shouldReject: true,
			description:  "Message content over 10000 characters should be rejected",
		},
		{
			name: "invalid message role",
			messages: []map[string]string{
				{"role": "hacker", "content": "malicious message"},
			},
			expectedCode: http.StatusBadRequest,
			shouldReject: true,
			description:  "Invalid message role should be rejected",
		},
		{
			name: "message content at limit",
			messages: []map[string]string{
				{"role": "user", "content": strings.Repeat("a", 10000)},
			},
			expectedCode: http.StatusOK,
			shouldReject: false,
			description:  "Message content at exactly 10000 characters should be accepted",
		},
		{
			name: "exactly 100 messages",
			messages: func() []map[string]string {
				msgs := make([]map[string]string, 100)
				for i := 0; i < 100; i++ {
					msgs[i] = map[string]string{"role": "user", "content": "test"}
				}
				return msgs
			}(),
			expectedCode: http.StatusOK,
			shouldReject: false,
			description:  "Exactly 100 messages should be accepted",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Reset rate limiter for each test case
			globalRateLimiter.reset()
			
			// Create request body
			reqBody := map[string]interface{}{
				"model":    "llama-3.3-70b-versatile",
				"messages": tc.messages,
			}

			body, err := json.Marshal(reqBody)
			if err != nil {
				t.Fatalf("Failed to marshal request body: %v", err)
			}

			// Create HTTP request
			req := httptest.NewRequest("POST", "/groq-chat", bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")

			// Create response recorder
			rr := httptest.NewRecorder()

			// Call the handler
			ds.handleGroqChat(rr, req)

			// Check response
			if tc.shouldReject {
				if rr.Code != tc.expectedCode {
					t.Errorf("Expected status code %d for %s, got %d", tc.expectedCode, tc.description, rr.Code)
				}
			} else {
				// For valid cases, we expect the handler to proceed to make the external API call
				// Since we don't have a real API key and server, we'll get a different error
				// but not the validation error
				if rr.Code == http.StatusBadRequest && (strings.Contains(rr.Body.String(), "Too many messages") ||
					strings.Contains(rr.Body.String(), "Message content too long") ||
					strings.Contains(rr.Body.String(), "Invalid message role")) {
					t.Errorf("Valid messages were incorrectly rejected: %s", tc.description)
				}
			}
		})
	}
}

func TestHTTPMethodValidation(t *testing.T) {
	ds := &Datasource{}

	// Test non-POST methods
	methods := []string{"GET", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"}

	for _, method := range methods {
		t.Run("reject_"+method, func(t *testing.T) {
			req := httptest.NewRequest(method, "/groq-chat", nil)
			rr := httptest.NewRecorder()

			ds.handleGroqChat(rr, req)

			if rr.Code != http.StatusMethodNotAllowed {
				t.Errorf("Expected status code %d for %s method, got %d", http.StatusMethodNotAllowed, method, rr.Code)
			}
		})
	}
}

func TestAPIKeyValidation(t *testing.T) {
	// Test without API key
	originalKey := os.Getenv("GROQ_API_KEY")
	os.Unsetenv("GROQ_API_KEY")
	defer func() {
		if originalKey != "" {
			os.Setenv("GROQ_API_KEY", originalKey)
		}
	}()
	
	// Reset rate limiter for clean tests
	globalRateLimiter.reset()

	ds := &Datasource{}

	reqBody := map[string]interface{}{
		"model": "llama-3.3-70b-versatile",
		"messages": []map[string]string{
			{"role": "user", "content": "test"},
		},
	}

	body, err := json.Marshal(reqBody)
	if err != nil {
		t.Fatalf("Failed to marshal request body: %v", err)
	}

	req := httptest.NewRequest("POST", "/groq-chat", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	ds.handleGroqChat(rr, req)

	if rr.Code != http.StatusInternalServerError {
		t.Errorf("Expected status code %d when API key is missing, got %d", http.StatusInternalServerError, rr.Code)
	}

	if !strings.Contains(rr.Body.String(), "Service configuration error") {
		t.Errorf("Expected API key error message, got: %s", rr.Body.String())
	}
}
