package main

import (
	"bytes"
	"crypto/sha256"
	"crypto/tls"
	"flag"
	"fmt"
	"io"
	"io/ioutil"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"
	"text/template"
	"time"
)

var appPort = "8073"
var dataPath string
var indexTemplate *template.Template
var application Application

type Application struct {
	Version            string
	S3BucketName       string
	S3BucketRegion     string
	AWSAccessKeyId     string
	AWSSecretAccessKey string
}

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
	fullPath := filepath.Join(dataPath, filename)
	if request.Method == "GET" {
		_, err := os.Stat(fullPath)
		if err != nil {
			response.WriteHeader(404)
			fmt.Print("404 file not found: " + fullPath + "\n\n")
			fmt.Fprint(response, "404 file not found")
			return
		}
		file, err := os.Open(fullPath)
		if err != nil {
			response.WriteHeader(404)
			fmt.Print("404 file not found: " + fullPath + "\n\n")
			fmt.Fprint(response, "404 file not found")
			return
		}
		defer file.Close()
		response.Header().Add("Content-Type", "application/json")
		io.Copy(response, file)
	} else if request.Method == "PUT" {

		bytes, err := ioutil.ReadAll(request.Body)
		if err != nil {
			response.WriteHeader(500)
			fmt.Fprintf(response, "500 %s", err)
			return
		}
		err = ioutil.WriteFile(fullPath, bytes, 0644)
		if err != nil {
			response.WriteHeader(500)
			fmt.Fprintf(response, "500 %s", err)
			return
		}

	} else if request.Method == "DELETE" {
		response.WriteHeader(500)
		fmt.Fprint(response, "500 not implemented yet")
	} else {
		response.Header().Add("Allow", "GET, PUT, DELETE")
		response.WriteHeader(405)
		fmt.Fprint(response, "405 Method Not Supported")
	}
}

func indexHtml(response http.ResponseWriter, request *http.Request) {
	if request.URL.Path != "/" {
		response.WriteHeader(404)
		fmt.Fprintf(response, "404 not found: %s", request.URL.Path)
		return
	}
	var buffer bytes.Buffer
	err := indexTemplate.Execute(&buffer, application)
	if err != nil {
		response.WriteHeader(500)
		fmt.Fprintf(response, "500 %s", err)
		return
	}
	response.Header().Set("Etag", application.Version)

	io.Copy(response, &buffer)
}

func loadTemplate(filename string) *template.Template {
	newTemplateString, err := ioutil.ReadFile(filename)
	if err != nil {
		panic(err)
	}
	newTemplate, err := template.New(filename).Parse(string(newTemplateString))
	if err != nil {
		panic(err)
	}
	return newTemplate
}

func hashFiles(filenames []string) string {
	hash := sha256.New()
	for _, filename := range filenames {
		fileContents, err := ioutil.ReadFile(filename)
		if err != nil {
			panic(err)
		}
		hash.Write([]byte(fileContents))
	}
	return fmt.Sprintf("%x", hash.Sum(nil))
}

func reloadStaticFiles() {
	application.Version = hashFiles([]string{
		"index.html.gotemplate",
		"static/application.js",
		"static/serviceworker.js",
		"static/awsClient.js",
		"static/application.css",
		"static/vendor/sjcl.js",
		"static/vendor/tenThousandMostCommonEnglishWords.js",
	})[:6]
	application.AWSAccessKeyId = os.ExpandEnv("$SEQUENTIAL_READ_PWM_AWS_ACCESS_KEY_ID")
	application.AWSSecretAccessKey = os.ExpandEnv("$SEQUENTIAL_READ_PWM_AWS_SECRET_ACCESS_KEY")
	application.S3BucketName = os.ExpandEnv("$SEQUENTIAL_READ_PWM_S3_BUCKET_NAME")
	application.S3BucketRegion = os.ExpandEnv("$SEQUENTIAL_READ_PWM_S3_BUCKET_REGION")

	indexTemplate = loadTemplate("index.html.gotemplate")
}

func main() {

	dataPath = filepath.Join(".", "data")
	os.MkdirAll(dataPath, os.ModePerm)

	reloadStaticFiles()

	http.HandleFunc("/", indexHtml)

	http.HandleFunc("/serviceworker.js", func(response http.ResponseWriter, request *http.Request) {
		file, _ := os.OpenFile("static/serviceworker.js", os.O_RDONLY, 0755)
		defer file.Close()
		response.Header().Set("Etag", application.Version)
		response.Header().Set("Content-Type", "application/javascript")
		io.Copy(response, file)
	})

	http.HandleFunc("/version", func(response http.ResponseWriter, request *http.Request) {
		response.WriteHeader(200)
		fmt.Fprint(response, application.Version)
	})

	http.HandleFunc("/storage/", storage)

	http.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("./static/"))))

	var headless = flag.Bool("headless", false, "headless server mode")
	var tlsFlag = flag.String("tls", "", "path to tlsFlag cert/key (for example, entering \"test\" will resolve \"./test.key\" and \"./test.pem\"")
	flag.Parse()

	if headless == nil || *headless == false {

		go func() {
			for true {
				reloadStaticFiles()
				time.Sleep(time.Second * 2)
			}
		}()

		go func() {
			var appUrl = "http://localhost:" + appPort
			if tlsFlag != nil && *tlsFlag != "" {
				appUrl = "https://localhost:" + appPort
			}
			var serverIsRunning = false
			var attempts = 0
			for !serverIsRunning && attempts < 15 {
				attempts += 1
				time.Sleep(time.Millisecond * 500)
				tr := &http.Transport{
					TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
				}
				client := &http.Client{Transport: tr}
				response, err := client.Get(appUrl)

				if err == nil && response.StatusCode == 200 {
					serverIsRunning = true
				}
			}
			openUrl(appUrl)
		}()
	}

	if tlsFlag != nil && *tlsFlag != "" {
		err := http.ListenAndServeTLS(":"+appPort, fmt.Sprintf("%s.pem", *tlsFlag), fmt.Sprintf("%s.key", *tlsFlag), nil)
		panic(err)
	} else {
		err := http.ListenAndServe(":"+appPort, nil)
		panic(err)
	}

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
