package auth

import (
	"github.com/baize/backend/internal/config"
	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID  uint   `json:"user_id"`
	Email   string `json:"email"`
	Tier    string `json:"tier"`
	IsAdmin bool   `json:"is_admin"`
	jwt.RegisteredClaims
}

func ParseToken(tokenStr string) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
		return []byte(config.App.JWTSecret), nil
	})
	if err != nil || !token.Valid {
		return nil, err
	}
	return claims, nil
}
