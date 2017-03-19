package main

import (
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"
	"time"
)

var appPort = "8073"
var dataPath string

func storage(response http.ResponseWriter, request *http.Request) {
	var filename string
	var pathElements = strings.Split(request.RequestURI, "/")
	filename = pathElements[len(pathElements)-1]
	matched, err := regexp.MatchString("[a-f0-9]+", filename)
	if err != nil {
		response.WriteHeader(500)
		fmt.Fprintf(response, "500 %s", err)
		return
	}
	if !matched {
		response.WriteHeader(400)
		fmt.Fprint(response, "400 filename must be a hexadecimal string")
		return
	}
	if request.Method == "GET" {
		file, err := os.Open(filepath.Join(dataPath, filename))
		if err != nil {
			response.WriteHeader(404)
			fmt.Fprint(response, "404 file not found")
			return
		}
		defer file.Close()
		response.Header().Add("Content-Type", "application/json")
		io.Copy(response, file)
	} else if request.Method == "PUT" {
		file, err := os.OpenFile(filepath.Join(dataPath, filename), os.O_RDWR|os.O_CREATE, 0755)
		if err != nil {
			response.WriteHeader(500)
			fmt.Fprintf(response, "500 internal server error: %s", err)
			return
		}
		defer file.Close()
		defer request.Body.Close()
		io.Copy(file, request.Body)
	} else if request.Method == "DELETE" {
		response.WriteHeader(500)
		fmt.Fprint(response, "500 not implemented yet")
	} else {
		response.Header().Add("Allow", "GET, PUT, DELETE")
		response.WriteHeader(405)
		fmt.Fprint(response, "405 Method Not Supported")
	}
}

func main() {

	dataPath = filepath.Join(".", "data")
	os.MkdirAll(dataPath, os.ModePerm)

	http.HandleFunc("/storage/", storage)
	http.Handle("/", http.FileServer(http.Dir("./frontend/")))

	var headless = flag.Bool("headless", false, "headless server mode")
	if *headless == false {
		go func() {
			var appUrl = "http://localhost:" + appPort
			var serverIsRunning = false
			var attempts = 0
			for !serverIsRunning && attempts < 15 {
				attempts += 1
				time.Sleep(time.Millisecond * 500)
				response, err := http.Get(appUrl)
				if err == nil && response.StatusCode == 200 {
					serverIsRunning = true
				}
			}
			openUrl(appUrl)
		}()
	}

	//http.ListenAndServeTLS(":443", "test-server.pem", "test-server.key", nil)
	http.ListenAndServe(":"+appPort, nil)

}

func openUrl(url string) {
	var err error
	switch runtime.GOOS {
	case "linux":
		err = exec.Command("xdg-open", url).Start()
	case "darwin":
		err = exec.Command("open", url).Start()
	case "windows":
		err = exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
	default:
		err = fmt.Errorf("unsupported platform")
	}
	if err != nil {
		fmt.Printf("can't open app in web browser because '%s'\n", err)
	}
}
