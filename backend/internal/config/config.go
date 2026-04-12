package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
	"gopkg.in/yaml.v3"
)

type EmailServerConfig struct {
	SMTPHost  string `yaml:"smtp_host"`
	SMTPPort  string `yaml:"smtp_port"`
	SendEmail string `yaml:"send_email"`
	AuthCode  string `yaml:"auth_code"`
	UseTLS    bool   `yaml:"use_tls"`
}

type Config struct {
	ServerPort       string `yaml:"server_port"`
	DBHost           string `yaml:"db_host"`
	DBPort           string `yaml:"db_port"`
	DBUser           string `yaml:"db_user"`
	DBPassword       string `yaml:"db_password"`
	DBName           string `yaml:"db_name"`
	JWTSecret        string `yaml:"jwt_secret"`
	S3Endpoint       string `yaml:"s3_endpoint"`
	S3AccessKey      string `yaml:"s3_access_key"`
	S3SecretKey      string `yaml:"s3_secret_key"`
	S3Bucket         string `yaml:"s3_bucket"`
	S3Region         string `yaml:"s3_region"`
	S3ForcePathStyle bool   `yaml:"s3_force_path_style"`
	StorageProvider  string `yaml:"storage_provider"`
	DeepSeekAPIKey   string `yaml:"deepseek_api_key"`
	OpenAIAPIKey     string `yaml:"openai_api_key"`
	AnthropicAPIKey  string `yaml:"anthropic_api_key"`
	MinimaxAPIKey    string `yaml:"minimax_api_key"`
	DefaultAIModel   string `yaml:"default_ai_model"`
	EmailServer      EmailServerConfig `yaml:"email_server"`
}

var App Config

func Load() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Step 1: Load defaults from environment variables
	App = Config{
		ServerPort:      getEnv("SERVER_PORT", "8080"),
		DBHost:          getEnv("DB_HOST", "localhost"),
		DBPort:          getEnv("DB_PORT", "3306"),
		DBUser:          getEnv("DB_USER", "root"),
		DBPassword:      getEnv("DB_PASSWORD", ""),
		DBName:          getEnv("DB_NAME", "baize"),
		JWTSecret:       getEnv("JWT_SECRET", "change-me-in-production"),
		S3Endpoint:       getEnv("S3_ENDPOINT", "http://localhost:9000"),
		S3AccessKey:      getEnv("S3_ACCESS_KEY", "minioadmin"),
		S3SecretKey:      getEnv("S3_SECRET_KEY", "minioadmin"),
		S3Bucket:         getEnv("S3_BUCKET", "baize-resumes"),
		S3Region:         getEnv("S3_REGION", "us-east-1"),
		S3ForcePathStyle: getEnv("S3_FORCE_PATH_STYLE", "true") == "true",
		StorageProvider:  getEnv("STORAGE_PROVIDER", "s3"),
		DeepSeekAPIKey:  getEnv("DEEPSEEK_API_KEY", ""),
		OpenAIAPIKey:    getEnv("OPENAI_API_KEY", ""),
		AnthropicAPIKey: getEnv("ANTHROPIC_API_KEY", ""),
		MinimaxAPIKey:   getEnv("MINIMAX_API_KEY", ""),
		DefaultAIModel:  getEnv("DEFAULT_AI_MODEL", "minimax"),
		EmailServer: EmailServerConfig{
			SMTPHost:  getEnv("EMAIL_SMTP_HOST", ""),
			SMTPPort:  getEnv("EMAIL_SMTP_PORT", "465"),
			SendEmail: getEnv("EMAIL_SEND_EMAIL", ""),
			AuthCode:  getEnv("EMAIL_AUTH_CODE", ""),
			UseTLS:    getEnv("EMAIL_USE_TLS", "false") == "true",
		},
	}

	// Step 2: Try to load YAML config file (overrides env vars)
	loadYAMLConfig()
}

func loadYAMLConfig() {
	configPath := os.Getenv("CONFIG_FILE")
	if configPath == "" {
		configPath = "./config.yaml"
	}

	data, err := os.ReadFile(configPath)
	if err != nil {
		// Config file not found is not an error
		return
	}

	log.Printf("Loading config from %s", configPath)

	var fileConfig Config
	if err := yaml.Unmarshal(data, &fileConfig); err != nil {
		log.Printf("Warning: failed to parse config file %s: %v", configPath, err)
		return
	}

	// Step 3: Override only non-empty values from YAML
	if fileConfig.ServerPort != "" {
		App.ServerPort = fileConfig.ServerPort
	}
	if fileConfig.DBHost != "" {
		App.DBHost = fileConfig.DBHost
	}
	if fileConfig.DBPort != "" {
		App.DBPort = fileConfig.DBPort
	}
	if fileConfig.DBUser != "" {
		App.DBUser = fileConfig.DBUser
	}
	if fileConfig.DBPassword != "" {
		App.DBPassword = fileConfig.DBPassword
	}
	if fileConfig.DBName != "" {
		App.DBName = fileConfig.DBName
	}
	if fileConfig.JWTSecret != "" {
		App.JWTSecret = fileConfig.JWTSecret
	}
	if fileConfig.S3Endpoint != "" {
		App.S3Endpoint = fileConfig.S3Endpoint
	}
	if fileConfig.S3AccessKey != "" {
		App.S3AccessKey = fileConfig.S3AccessKey
	}
	if fileConfig.S3SecretKey != "" {
		App.S3SecretKey = fileConfig.S3SecretKey
	}
	if fileConfig.S3Bucket != "" {
		App.S3Bucket = fileConfig.S3Bucket
	}
	if fileConfig.S3Region != "" {
		App.S3Region = fileConfig.S3Region
	}
	if fileConfig.DeepSeekAPIKey != "" {
		App.DeepSeekAPIKey = fileConfig.DeepSeekAPIKey
	}
	if fileConfig.OpenAIAPIKey != "" {
		App.OpenAIAPIKey = fileConfig.OpenAIAPIKey
	}
	if fileConfig.AnthropicAPIKey != "" {
		App.AnthropicAPIKey = fileConfig.AnthropicAPIKey
	}
	if fileConfig.MinimaxAPIKey != "" {
		App.MinimaxAPIKey = fileConfig.MinimaxAPIKey
	}
	if fileConfig.StorageProvider != "" {
		App.StorageProvider = fileConfig.StorageProvider
	}
	if fileConfig.DefaultAIModel != "" {
		App.DefaultAIModel = fileConfig.DefaultAIModel
	}
	// S3ForcePathStyle: check if explicitly set in YAML
	var rawMap map[string]interface{}
	if err := yaml.Unmarshal(data, &rawMap); err == nil {
		if _, exists := rawMap["s3_force_path_style"]; exists {
			App.S3ForcePathStyle = fileConfig.S3ForcePathStyle
		}
	}

	// Load nested email_server config (yaml tags handle field mapping automatically)
	if fileConfig.EmailServer.SMTPHost != "" {
		App.EmailServer.SMTPHost = fileConfig.EmailServer.SMTPHost
	}
	if fileConfig.EmailServer.SMTPPort != "" {
		App.EmailServer.SMTPPort = fileConfig.EmailServer.SMTPPort
	}
	if fileConfig.EmailServer.SendEmail != "" {
		App.EmailServer.SendEmail = fileConfig.EmailServer.SendEmail
	}
	if fileConfig.EmailServer.AuthCode != "" {
		App.EmailServer.AuthCode = fileConfig.EmailServer.AuthCode
	}
	// use_tls: override if explicitly set in yaml
	if _, exists := rawMap["email_server"]; exists {
		App.EmailServer.UseTLS = fileConfig.EmailServer.UseTLS
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
