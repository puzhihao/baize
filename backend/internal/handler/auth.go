package handler

import (
	"log"
	"net/http"

	"github.com/baize/backend/internal/database"
	"github.com/baize/backend/internal/model"
	"github.com/baize/backend/internal/service"
	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	svc service.AuthService
}

func NewAuthHandler() *AuthHandler {
	return &AuthHandler{svc: service.AuthService{}}
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req service.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	user, err := h.svc.Register(req)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"message": "注册成功", "user": user})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req service.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	tokens, err := h.svc.Login(req)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, tokens)
}

// CheckUsername 检查用户名是否已被使用
func (h *AuthHandler) CheckUsername(c *gin.Context) {
	var req struct {
		Username string `json:"username" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if taken := h.svc.IsUsernameTaken(req.Username); taken {
		c.JSON(http.StatusConflict, gin.H{"error": "该用户名已被使用，请换一个"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"available": true})
}

func (h *AuthHandler) Refresh(c *gin.Context) {
	var body struct {
		RefreshToken string `json:"refresh_token" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	tokens, err := h.svc.RefreshToken(body.RefreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, tokens)
}

func (h *AuthHandler) Me(c *gin.Context) {
	userID := c.GetUint("user_id")
	isAdmin, _ := c.Get("is_admin")

	var user model.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusOK, gin.H{
			"user_id":       userID,
			"email":         c.GetString("email"),
			"tier":          c.GetString("tier"),
			"is_admin":      isAdmin,
			"analysis_used": 0,
		})
		return
	}

	var sub model.Subscription
	database.DB.Where("user_id = ?", userID).First(&sub)

	c.JSON(http.StatusOK, gin.H{
		"user_id":          userID,
		"email":            user.Email,
		"username":         user.Username,
		"tier":             string(user.Tier),
		"is_admin":         isAdmin,
		"analysis_used":    user.AnalysisUsed,
		"subscription_end": sub.EndAt,
	})
}

// CheckEmail 检查邮箱是否已被注册
func (h *AuthHandler) CheckEmail(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required,email"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if taken := h.svc.IsEmailTaken(req.Email); taken {
		c.JSON(http.StatusConflict, gin.H{"error": "该邮箱已被注册，请直接登录"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"available": true})
}
// @Description 向指定邮箱发送6位数字验证码，有效期5分钟
// @Tags auth
// @Accept json
// @Produce json
// @Param body body object{email=string} true "邮箱"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Router /auth/send-code [post]
func (h *AuthHandler) SendCode(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required,email"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("[SendCode] 请求参数错误: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	log.Printf("[SendCode] 收到发送验证码请求 email=%s", req.Email)
	if err := h.svc.SendCode(req.Email); err != nil {
		log.Printf("[SendCode] 处理失败 email=%s: %v", req.Email, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "验证码已发送"})
}

func (h *AuthHandler) ResetPassword(c *gin.Context) {
	var req service.ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.svc.ResetPassword(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "密码重置成功"})
}

func (h *AuthHandler) SendResetCode(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required,email"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.svc.SendResetCode(req.Email); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "验证码已发送"})
}
