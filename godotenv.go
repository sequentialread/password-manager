// Package godotenv is a go port of the ruby dotenv library (https://github.com/bkeepers/dotenv)
//
// Examples/readme can be found on the github page at https://github.com/joho/godotenv
//
// The TL;DR is that you make a .env file that looks something like
//
// 		SOME_ENV_VAR=somevalue
//
// and then in your go code you can call
//
// 		godotenv.GoDotEnvLoad()
//
// and all the env vars declared in .env will be available through os.Getenv("SOME_ENV_VAR")
package main

import (
	"bufio"
	"errors"
	"io"
	"os"
	"regexp"
	"strings"
)

const goDotEnvDoubleQuoteSpecialChars = "\\\n\r\"!$`"

// GoDotEnvLoad will read your env file(s) and load them into ENV for this process.
//
// Call this function as close as possible to the start of your program (ideally in main)
//
// If you call GoDotEnvLoad without any args it will default to loading .env in the current path
//
// You can otherwise tell it which files to load (there can be more than one) like
//
//		godotenv.GoDotEnvLoad("fileone", "filetwo")
//
// It's important to note that it WILL NOT OVERRIDE an env variable that already exists - consider the .env file to set dev vars or sensible defaults
func GoDotEnvLoad(filenames ...string) (err error) {
	filenames = goDotEnvFilenamesOrDefault(filenames)

	for _, filename := range filenames {
		err = goDotEnvLoadFile(filename, false)
		if err != nil {
			return // return early on a spazout
		}
	}
	return
}

func goDotEnvFilenamesOrDefault(filenames []string) []string {
	if len(filenames) == 0 {
		return []string{".env"}
	}
	return filenames
}

func goDotEnvLoadFile(filename string, overload bool) error {
	envMap, err := goDotEnvReadFile(filename)
	if err != nil {
		return err
	}

	currentEnv := map[string]bool{}
	rawEnv := os.Environ()
	for _, rawEnvLine := range rawEnv {
		key := strings.Split(rawEnvLine, "=")[0]
		currentEnv[key] = true
	}

	for key, value := range envMap {
		if !currentEnv[key] || overload {
			os.Setenv(key, value)
		}
	}

	return nil
}

func goDotEnvReadFile(filename string) (envMap map[string]string, err error) {
	file, err := os.Open(filename)
	if err != nil {
		return
	}
	defer file.Close()

	return goDotEnvParse(file)
}

// goDotEnvParse reads an env file from io.Reader, returning a map of keys and values.
func goDotEnvParse(r io.Reader) (envMap map[string]string, err error) {
	envMap = make(map[string]string)

	var lines []string
	scanner := bufio.NewScanner(r)
	for scanner.Scan() {
		lines = append(lines, scanner.Text())
	}

	if err = scanner.Err(); err != nil {
		return
	}

	for _, fullLine := range lines {
		if !goDotEnvIsIgnoredLine(fullLine) {
			var key, value string
			key, value, err = parseLine(fullLine, envMap)

			if err != nil {
				return
			}
			envMap[key] = value
		}
	}
	return
}

var exportRegex = regexp.MustCompile(`^\s*(?:export\s+)?(.*?)\s*$`)

func parseLine(line string, envMap map[string]string) (key string, value string, err error) {
	if len(line) == 0 {
		err = errors.New("zero length string")
		return
	}

	// ditch the comments (but keep quoted hashes)
	if strings.Contains(line, "#") {
		segmentsBetweenHashes := strings.Split(line, "#")
		quotesAreOpen := false
		var segmentsToKeep []string
		for _, segment := range segmentsBetweenHashes {
			if strings.Count(segment, "\"") == 1 || strings.Count(segment, "'") == 1 {
				if quotesAreOpen {
					quotesAreOpen = false
					segmentsToKeep = append(segmentsToKeep, segment)
				} else {
					quotesAreOpen = true
				}
			}

			if len(segmentsToKeep) == 0 || quotesAreOpen {
				segmentsToKeep = append(segmentsToKeep, segment)
			}
		}

		line = strings.Join(segmentsToKeep, "#")
	}

	firstEquals := strings.Index(line, "=")
	firstColon := strings.Index(line, ":")
	splitString := strings.SplitN(line, "=", 2)
	if firstColon != -1 && (firstColon < firstEquals || firstEquals == -1) {
		//this is a yaml-style line
		splitString = strings.SplitN(line, ":", 2)
	}

	if len(splitString) != 2 {
		err = errors.New("Can't separate key from value")
		return
	}

	// goDotEnvParse the key
	key = splitString[0]
	if strings.HasPrefix(key, "export") {
		key = strings.TrimPrefix(key, "export")
	}
	key = strings.TrimSpace(key)

	key = exportRegex.ReplaceAllString(splitString[0], "$1")

	// goDotEnvParse the value
	value = parseValue(splitString[1], envMap)
	return
}

var (
	goDotEnvSingleQuotesRegex  = regexp.MustCompile(`\A'(.*)'\z`)
	goDotEnvDoubleQuotesRegex  = regexp.MustCompile(`\A"(.*)"\z`)
	goDotEnvEscapeRegex        = regexp.MustCompile(`\\.`)
	goDotEnvUnescapeCharsRegex = regexp.MustCompile(`\\([^$])`)
)

func parseValue(value string, envMap map[string]string) string {

	// trim
	value = strings.Trim(value, " ")

	// check if we've got quoted values or possible escapes
	if len(value) > 1 {
		singleQuotes := goDotEnvSingleQuotesRegex.FindStringSubmatch(value)

		doubleQuotes := goDotEnvDoubleQuotesRegex.FindStringSubmatch(value)

		if singleQuotes != nil || doubleQuotes != nil {
			// pull the quotes off the edges
			value = value[1 : len(value)-1]
		}

		if doubleQuotes != nil {
			// expand newlines
			value = goDotEnvEscapeRegex.ReplaceAllStringFunc(value, func(match string) string {
				c := strings.TrimPrefix(match, `\`)
				switch c {
				case "n":
					return "\n"
				case "r":
					return "\r"
				default:
					return match
				}
			})
			// unescape characters
			value = goDotEnvUnescapeCharsRegex.ReplaceAllString(value, "$1")
		}

		if singleQuotes == nil {
			value = goDotEnvExpandVariables(value, envMap)
		}
	}

	return value
}

var expandVarRegex = regexp.MustCompile(`(\\)?(\$)(\()?\{?([A-Z0-9_]+)?\}?`)

func goDotEnvExpandVariables(v string, m map[string]string) string {
	return expandVarRegex.ReplaceAllStringFunc(v, func(s string) string {
		submatch := expandVarRegex.FindStringSubmatch(s)

		if submatch == nil {
			return s
		}
		if submatch[1] == "\\" || submatch[2] == "(" {
			return submatch[0][1:]
		} else if submatch[4] != "" {
			return m[submatch[4]]
		}
		return s
	})
}

func goDotEnvIsIgnoredLine(line string) bool {
	trimmedLine := strings.TrimSpace(line)
	return len(trimmedLine) == 0 || strings.HasPrefix(trimmedLine, "#")
}
