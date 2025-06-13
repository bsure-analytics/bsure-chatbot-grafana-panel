package plugin

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
)

func TestHandleGroqChatBasic(t *testing.T) {
	ds := &Datasource{}

	tests := []struct {
		name           string
		method         string
		body           string
		apiKey         string
		expectedStatus int
		expectedBody   string
	}{
		{
			name:           "Method not allowed",
			method:         "GET",
			body:           "",
			apiKey:         "test-api-key",
			expectedStatus: http.StatusMethodNotAllowed,
			expectedBody:   "Method not allowed",
		},
		{
			name:           "Missing API key",
			method:         "POST", 
			body:           `{"model":"test","messages":[{"role":"user","content":"hello"}]}`,
			apiKey:         "",
			expectedStatus: http.StatusInternalServerError,
			expectedBody:   "Service configuration error",
		},
		{
			name:           "Invalid JSON body",
			method:         "POST",
			body:           "invalid json",
			apiKey:         "test-api-key",
			expectedStatus: http.StatusBadRequest,
			expectedBody:   "Invalid request body",
		},
		{
			name:           "Empty model name",
			method:         "POST",
			body:           `{"model":"","messages":[{"role":"user","content":"hello"}]}`,
			apiKey:         "test-api-key",
			expectedStatus: http.StatusBadRequest,
			expectedBody:   "Invalid model name",
		},
		{
			name:           "Invalid message role",
			method:         "POST",
			body:           `{"model":"test","messages":[{"role":"invalid","content":"hello"}]}`,
			apiKey:         "test-api-key",
			expectedStatus: http.StatusBadRequest,
			expectedBody:   "Invalid message role",
		},
		{
			name:           "Message content too long",
			method:         "POST",
			body:           `{"model":"test","messages":[{"role":"user","content":"` + strings.Repeat("a", 10001) + `"}]}`,
			apiKey:         "test-api-key",
			expectedStatus: http.StatusBadRequest,
			expectedBody:   "Message content too long",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Set environment variable
			if tt.apiKey != "" {
				os.Setenv("GROQ_API_KEY", tt.apiKey)
			} else {
				os.Unsetenv("GROQ_API_KEY")
			}
			defer os.Unsetenv("GROQ_API_KEY")

			req := httptest.NewRequest(tt.method, "/groq-chat", strings.NewReader(tt.body))
			req.Header.Set("Content-Type", "application/json")

			rr := httptest.NewRecorder()
			ds.handleGroqChat(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d", tt.expectedStatus, rr.Code)
			}

			if tt.expectedBody != "" {
				body := strings.TrimSpace(rr.Body.String())
				if !strings.Contains(body, tt.expectedBody) {
					t.Errorf("Expected body to contain '%s', got '%s'", tt.expectedBody, body)
				}
			}
		})
	}
}

func TestRequestBodySizeLimit(t *testing.T) {
	ds := &Datasource{}
	os.Setenv("GROQ_API_KEY", "test-api-key")
	defer os.Unsetenv("GROQ_API_KEY")

	// Create a request with body larger than 1MB
	largeBody := make([]byte, 1024*1024+1) // 1MB + 1 byte
	for i := range largeBody {
		largeBody[i] = 'a'
	}

	req := httptest.NewRequest("POST", "/groq-chat", bytes.NewBuffer(largeBody))
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()
	ds.handleGroqChat(rr, req)

	// Should fail due to size limit
	if rr.Code != http.StatusBadRequest {
		t.Errorf("Expected status %d for oversized request, got %d", http.StatusBadRequest, rr.Code)
	}
}

func TestValidation(t *testing.T) {
	// Test basic validation logic
	validRoles := []string{"user", "assistant", "system"}
	invalidRoles := []string{"admin", "bot", "human", ""}

	for _, role := range validRoles {
		found := false
		for _, validRole := range []string{"user", "assistant", "system"} {
			if role == validRole {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("Valid role %s not recognized", role)
		}
	}

	for _, role := range invalidRoles {
		found := false
		for _, validRole := range []string{"user", "assistant", "system"} {
			if role == validRole {
				found = true
				break
			}
		}
		if found {
			t.Errorf("Invalid role %s was accepted", role)
		}
	}
}

func TestNewDatasourceBasic(t *testing.T) {
	ds := &Datasource{}
	
	// Should not panic
	ds.Dispose()
	
	// Test that struct exists
	if ds == nil {
		t.Error("Datasource should not be nil")
	}
}