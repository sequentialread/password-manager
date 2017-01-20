package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	htmlTemplate "html/template"
	"io/ioutil"
	"net/http"
	"strconv"
	"time"
)

var (
	landingPageTemplate *htmlTemplate.Template
	appVersion          string
)

type windowViewModel struct {
	Version string
}

type javaScriptError struct {
	Location   string
	Message    string
	File       string
	Line       int
	Column     int
	StackTrace string
	JSDateMs   int64
	Username   string
}

func landingPage(response http.ResponseWriter, request *http.Request) {
	if request.URL.Path != "/" {
		response.WriteHeader(404)
		fmt.Fprintf(response, "404 not found: %s", request.URL.Path)
		return
	}
	var bodyBuffer bytes.Buffer
	err := landingPageTemplate.Execute(&bodyBuffer, windowViewModel{
		Version: appVersion,
	})
	if err != nil {
		response.WriteHeader(500)
		fmt.Fprintf(response, "tryWriteHtml failed with '%s'", err)
		return
	}
	response.Write(bodyBuffer.Bytes())
}

func logError(response http.ResponseWriter, request *http.Request) {

	bodyBytes, err := ioutil.ReadAll(request.Body)
	if err != nil {
		fmt.Printf("can't log error because '%s'\n", err)
		return
	}

	var javascriptErrorInstance javaScriptError
	err = json.Unmarshal(bodyBytes, &javascriptErrorInstance)
	if err != nil {
		fmt.Printf("Javascript Error: \n%s", bodyBytes)
		return
	}
	fmt.Printf("Javascript Error:\n"+
		"Location: %s\nFile: %s at line (%s:%s)\nDateTime: %s\nUser: %s\nMessage: %s\n\nStackTrace: %s\n\n",
		javascriptErrorInstance.Location,
		javascriptErrorInstance.File,
		strconv.Itoa(javascriptErrorInstance.Line),
		strconv.Itoa(javascriptErrorInstance.Column),
		time.Unix(javascriptErrorInstance.JSDateMs/1000, 0),
		javascriptErrorInstance.Username,
		javascriptErrorInstance.Message,
		javascriptErrorInstance.StackTrace,
	)

	response.Write([]byte("ok"))
}

func persist(response http.ResponseWriter, request *http.Request) {
	if request.Method == "GET" {

	} else if request.Method == "PUT" || request.Method == "POST" {

	} else {
		response.Header().Add("Allow", "GET, PUT, POST")
		response.WriteHeader(405)
		fmt.Fprint(response, "405 Method Not Supported")
	}
}

func main() {

	var err error
	landingPageTemplate, err = htmlTemplate.ParseFiles("server/index.html")
	if err != nil {
		fmt.Printf("can't start server because '%s'\n", err)
		return
	}
	appVersion = "0"

	http.HandleFunc("/", landingPage)
	http.HandleFunc("/logError", logError)

	http.HandleFunc("/persist", persist)

	http.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("./static/"))))
	http.Handle("/fonts/", http.StripPrefix("/fonts/", http.FileServer(http.Dir("./static/fonts/"))))

	// serve source files for source maps
	http.Handle("/static/frontend/", http.StripPrefix("/static/frontend/", http.FileServer(http.Dir("./frontend/"))))
	http.Handle("/frontend/", http.StripPrefix("/frontend/", http.FileServer(http.Dir("./frontend/"))))

	//http.ListenAndServeTLS(":8080", "test-server.pem", "test-server.key", nil)
	http.ListenAndServe(":8080", nil)
}
