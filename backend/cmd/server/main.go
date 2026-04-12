package main

import (
	"log"

	"github.com/baize/backend/internal/config"
	"github.com/baize/backend/internal/database"
	"github.com/baize/backend/internal/handler"
	"github.com/baize/backend/internal/middleware"
	"github.com/baize/backend/internal/service"
	"github.com/baize/backend/pkg/ai"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	config.Load()
	database.Connect()
	database.Migrate()

	aiMgr := ai.NewManager(
		config.App.DeepSeekAPIKey,
		config.App.OpenAIAPIKey,
		config.App.AnthropicAPIKey,
		config.App.MinimaxAPIKey,
		config.App.DefaultAIModel,
	)
	service.InitResumeService(aiMgr)

	r := gin.Default()

	// CORS
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173", "https://baize.app"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	api := r.Group("/api")

	// Auth routes
	authH := handler.NewAuthHandler()
	auth := api.Group("/auth")
	{
		auth.POST("/register", authH.Register)
		auth.POST("/login", authH.Login)
		auth.POST("/refresh", authH.Refresh)
		auth.POST("/send-code", authH.SendCode)
		auth.POST("/check-email", authH.CheckEmail)
		auth.POST("/check-username", authH.CheckUsername)
		auth.GET("/me", middleware.AuthRequired(), authH.Me)
	}

	// Resume routes (all protected)
	resumeH := handler.NewResumeHandler(service.ResumeServiceInstance)
	resumes := api.Group("/resumes", middleware.AuthRequired())
	{
		resumes.POST("/upload", resumeH.Upload)
		resumes.POST("/text", resumeH.CreateFromText)
		resumes.GET("", resumeH.List)
		resumes.GET("/:id", resumeH.Get)
		resumes.DELETE("/:id", resumeH.Delete)
		resumes.POST("/:id/analyze", resumeH.Analyze)
		resumes.GET("/:id/stream", resumeH.StreamSuggestions)
		resumes.GET("/:id/versions", resumeH.ListVersions)
	}

	// Admin routes
	adminH := handler.NewAdminHandler()
	adminGroup := api.Group("/admin", middleware.AuthRequired(), middleware.AdminOnly())

	// Payment routes (protected)
	paymentH := handler.NewPaymentHandler()
	payment := api.Group("/payment", middleware.AuthRequired())
	{
		payment.POST("/orders", paymentH.CreateOrder)
		payment.POST("/orders/:id/confirm", paymentH.ConfirmPayment)
	}
	{
		adminGroup.GET("/stats", adminH.Stats)
		adminGroup.GET("/users", adminH.ListUsers)
		adminGroup.POST("/users", adminH.CreateUser)
		adminGroup.PUT("/users/:id", adminH.UpdateUser)
		adminGroup.DELETE("/users/:id", adminH.DeleteUser)
		adminGroup.GET("/resumes", adminH.ListResumes)
		adminGroup.POST("/resumes", adminH.CreateResume)
		adminGroup.PUT("/resumes/:id", adminH.UpdateResume)
		adminGroup.DELETE("/resumes/:id", adminH.DeleteResume)
		adminGroup.GET("/analyses", adminH.ListAnalyses)
		adminGroup.POST("/analyses", adminH.CreateAnalysis)
		adminGroup.PUT("/analyses/:id", adminH.UpdateAnalysis)
		adminGroup.DELETE("/analyses/:id", adminH.DeleteAnalysis)
		adminGroup.GET("/prompt", adminH.GetPrompt)
		adminGroup.PUT("/prompt", adminH.UpdatePrompt)
	}

	log.Printf("Baize backend starting on :%s", config.App.ServerPort)
	if err := r.Run(":" + config.App.ServerPort); err != nil {
		log.Fatal(err)
	}
}
