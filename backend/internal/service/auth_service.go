package service

import (
	"crypto/rand"
	"errors"
	"fmt"
	"log"
	"math/big"
	"time"

	"github.com/baize/backend/internal/auth"
	"github.com/baize/backend/internal/config"
	"github.com/baize/backend/internal/database"
	"github.com/baize/backend/internal/model"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type AuthService struct{}

type RegisterRequest struct {
	Username string `json:"username" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
	Code     string `json:"code" binding:"required"`
}

type LoginRequest struct {
	Account  string `json:"account" binding:"required"` // email or username
	Password string `json:"password" binding:"required"`
}

type TokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int64  `json:"expires_in"`
}

func (s *AuthService) IsUsernameTaken(username string) bool {
	var user model.User
	return database.DB.Where("username = ?", username).First(&user).Error == nil
}

func (s *AuthService) IsEmailTaken(email string) bool {
	var user model.User
	return database.DB.Where("email = ?", email).First(&user).Error == nil
}

func (s *AuthService) SendCode(email string) error {
	log.Printf("[SendCode] 开始为 %s 生成验证码", email)

	n, err := rand.Int(rand.Reader, big.NewInt(1000000))
	if err != nil {
		log.Printf("[SendCode] 生成随机数失败: %v", err)
		return err
	}
	code := fmt.Sprintf("%06d", n.Int64())

	// 持久化（先删除该邮箱旧验证码）
	database.DB.Where("email = ?", email).Delete(&model.VerificationCode{})
	vc := &model.VerificationCode{
		Email:     email,
		Code:      code,
		ExpiresAt: time.Now().Add(5 * time.Minute),
	}
	if err := database.DB.Create(vc).Error; err != nil {
		log.Printf("[SendCode] 持久化验证码失败 email=%s: %v", email, err)
		return err
	}
	log.Printf("[SendCode] 验证码已写入数据库，准备发送邮件 email=%s", email)

	if err := SendVerificationEmail(email, code); err != nil {
		log.Printf("[SendCode] 发送邮件失败 email=%s: %v", email, err)
		return err
	}
	log.Printf("[SendCode] 验证码邮件发送成功 email=%s", email)
	return nil
}

func (s *AuthService) SendResetCode(email string) error {
	log.Printf("[SendResetCode] 开始为 %s 生成重置密码验证码", email)

	var user model.User
	if err := database.DB.Where("email = ?", email).First(&user).Error; err != nil {
		return errors.New("该邮箱未注册")
	}

	n, err := rand.Int(rand.Reader, big.NewInt(1000000))
	if err != nil {
		return err
	}
	code := fmt.Sprintf("%06d", n.Int64())

	database.DB.Where("email = ?", email).Delete(&model.VerificationCode{})
	vc := &model.VerificationCode{
		Email:     email,
		Code:      code,
		ExpiresAt: time.Now().Add(5 * time.Minute),
	}
	if err := database.DB.Create(vc).Error; err != nil {
		return err
	}

	if err := SendResetPasswordEmail(email, code); err != nil {
		log.Printf("[SendResetCode] 发送邮件失败 email=%s: %v", email, err)
		return err
	}
	log.Printf("[SendResetCode] 重置密码验证码发送成功 email=%s", email)
	return nil
}

func (s *AuthService) Register(req RegisterRequest) (*model.User, error) {
	// Validate username format: must start with a letter, only lowercase letters/digits/underscores
	if len(req.Username) < 3 || len(req.Username) > 50 {
		return nil, errors.New("用户名长度须在3到50个字符之间")
	}
	if req.Username[0] < 'a' || req.Username[0] > 'z' {
		return nil, errors.New("用户名必须以小写字母开头")
	}
	for _, c := range req.Username {
		if !((c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '_') {
			return nil, errors.New("用户名只能包含小写字母、数字和下划线")
		}
	}
	if s.IsUsernameTaken(req.Username) {
		return nil, errors.New("该用户名已被使用，请换一个")
	}

	var existing model.User
	if err := database.DB.Where("email = ?", req.Email).First(&existing).Error; err == nil {
		return nil, errors.New("邮箱已被注册")
	}

	// 验证验证码
	var vc model.VerificationCode
	if err := database.DB.Where("email = ? AND used = ?", req.Email, false).
		Order("created_at desc").First(&vc).Error; err != nil {
		return nil, errors.New("验证码不存在，请先获取验证码")
	}
	if time.Now().After(vc.ExpiresAt) {
		return nil, errors.New("验证码已过期，请重新获取")
	}
	if vc.Code != req.Code {
		return nil, errors.New("验证码不正确")
	}
	// 标记已使用
	database.DB.Model(&vc).Update("used", true)

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}
	user := &model.User{
		Email:        req.Email,
		Username:     req.Username,
		PasswordHash: string(hash),
		Nickname:     req.Username,
		Tier:         model.TierFree,
	}
	if err := database.DB.Create(user).Error; err != nil {
		return nil, err
	}
	// Create default free subscription
	sub := &model.Subscription{
		UserID:  user.ID,
		Plan:    "free",
		Status:  model.SubStatusActive,
		StartAt: time.Now(),
	}
	database.DB.Create(sub)
	return user, nil
}

func (s *AuthService) Login(req LoginRequest) (*TokenPair, error) {
	var user model.User
	// Support login by email or username
	if err := database.DB.Where("email = ? OR username = ?", req.Account, req.Account).First(&user).Error; err != nil {
		return nil, errors.New("账号或密码错误")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, errors.New("账号或密码错误")
	}
	if user.IsDisabled {
		return nil, errors.New("账号已被禁用，请联系管理员")
	}
	return s.generateTokens(&user)
}

type ResetPasswordRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Code     string `json:"code" binding:"required"`
	Password string `json:"password" binding:"required,min=6"`
}

func (s *AuthService) ResetPassword(req ResetPasswordRequest) error {
	var user model.User
	if err := database.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		return errors.New("该邮箱未注册")
	}

	var vc model.VerificationCode
	if err := database.DB.Where("email = ? AND used = ?", req.Email, false).
		Order("created_at desc").First(&vc).Error; err != nil {
		return errors.New("验证码不存在，请先获取验证码")
	}
	if time.Now().After(vc.ExpiresAt) {
		return errors.New("验证码已过期，请重新获取")
	}
	if vc.Code != req.Code {
		return errors.New("验证码不正确")
	}
	database.DB.Model(&vc).Update("used", true)

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	return database.DB.Model(&user).Update("password_hash", string(hash)).Error
}

func (s *AuthService) generateTokens(user *model.User) (*TokenPair, error) {
	now := time.Now()
	accessExp := now.Add(2 * time.Hour)
	refreshExp := now.Add(30 * 24 * time.Hour)

	accessClaims := &auth.Claims{
		UserID:  user.ID,
		Email:   user.Email,
		Tier:    string(user.Tier),
		IsAdmin: user.IsAdmin,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(accessExp),
			IssuedAt:  jwt.NewNumericDate(now),
		},
	}
	accessToken, err := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims).SignedString([]byte(config.App.JWTSecret))
	if err != nil {
		return nil, err
	}

	refreshClaims := &auth.Claims{
		UserID:  user.ID,
		Email:   user.Email,
		Tier:    string(user.Tier),
		IsAdmin: user.IsAdmin,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(refreshExp),
			IssuedAt:  jwt.NewNumericDate(now),
		},
	}
	refreshToken, err := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims).SignedString([]byte(config.App.JWTSecret))
	if err != nil {
		return nil, err
	}
	return &TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    accessExp.Unix(),
	}, nil
}

func (s *AuthService) ChangePassword(userID uint, oldPw, newPw string) error {
	var user model.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		return errors.New("用户不存在")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(oldPw)); err != nil {
		return errors.New("旧密码不正确")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(newPw), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	return database.DB.Model(&user).Update("password_hash", string(hash)).Error
}

func (s *AuthService) RefreshToken(refreshToken string) (*TokenPair, error) {
	claims, err := auth.ParseToken(refreshToken)
	if err != nil {
		return nil, errors.New("refresh token无效")
	}
	var user model.User
	if err := database.DB.First(&user, claims.UserID).Error; err != nil {
		return nil, errors.New("用户不存在")
	}
	return s.generateTokens(&user)
}
