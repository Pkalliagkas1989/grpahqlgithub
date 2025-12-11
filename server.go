package main

import (
	"io"
	"log"
	"net/http"
	"os"
)

const (
	zoneBaseURL = "https://platform.zone01.gr/api"

	signinPath  = "/auth/signin"
	graphqlPath = "/graphql-engine/v1/graphql"

	defaultPort = "8080"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = defaultPort
	}

	mux := http.NewServeMux()

	// API proxy routes
	mux.HandleFunc("/signin", proxyHandler(zoneBaseURL+signinPath))
	mux.HandleFunc("/graphql", proxyHandler(zoneBaseURL+graphqlPath))

	// Static files (frontend) served from ./docs
	fs := http.FileServer(http.Dir("./docs"))
	mux.Handle("/", fs)

	log.Printf("Server listening on :%s\n", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatal(err)
	}
}

// Simple reverse proxy for POST requests
func proxyHandler(targetURL string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "only POST is allowed", http.StatusMethodNotAllowed)
			return
		}

		req, err := http.NewRequest(http.MethodPost, targetURL, r.Body)
		if err != nil {
			log.Println("error creating upstream request:", err)
			http.Error(w, "failed to create upstream request", http.StatusInternalServerError)
			return
		}
		defer r.Body.Close()

		// copy headers
		if auth := r.Header.Get("Authorization"); auth != "" {
			req.Header.Set("Authorization", auth)
		}
		if ct := r.Header.Get("Content-Type"); ct != "" {
			req.Header.Set("Content-Type", ct)
		}

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			log.Println("error calling upstream:", err)
			http.Error(w, "failed to contact upstream", http.StatusBadGateway)
			return
		}
		defer resp.Body.Close()

		if ct := resp.Header.Get("Content-Type"); ct != "" {
			w.Header().Set("Content-Type", ct)
		}

		w.WriteHeader(resp.StatusCode)
		if _, err := io.Copy(w, resp.Body); err != nil {
			log.Println("error copying response body:", err)
		}
	}
}
