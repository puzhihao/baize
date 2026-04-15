package model

import (
	"time"
)

type SystemPrompt struct {
	ID        uint      `gorm:"primaryKey"`
	Name      string    `gorm:"type:varchar(50);not null;default:'analysis'"` // "analysis" or "generate"
	Content   string    `gorm:"type:longtext;not null"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Tier string

const (
	TierFree Tier = "free"
	TierPro  Tier = "pro"
)

type User struct {
	ID           uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	Email        string    `gorm:"uniqueIndex;size:255;not null" json:"email"`
	Username     string    `gorm:"size:50;not null;default:''" json:"username"`
	PasswordHash string    `gorm:"size:255;not null" json:"-"`
	Nickname     string    `gorm:"size:100" json:"nickname"`
	Avatar       string    `gorm:"size:500" json:"avatar,omitempty"`
	Tier         Tier      `gorm:"type:enum('free','pro');default:'free'" json:"tier"`
	IsAdmin      bool      `gorm:"default:false" json:"is_admin"`
	IsDisabled   bool      `gorm:"default:false" json:"is_disabled"`
	AnalysisUsed int       `gorm:"default:0" json:"analysis_used"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type ResumeStatus string

const (
	ResumeStatusPending    ResumeStatus = "pending"
	ResumeStatusProcessing ResumeStatus = "processing"
	ResumeStatusReady      ResumeStatus = "ready"
	ResumeStatusFailed     ResumeStatus = "failed"
)

type Resume struct {
	ID        uint         `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID    uint         `gorm:"not null;index" json:"user_id"`
	Title     string       `gorm:"size:255;not null" json:"title"`
	FilePath  string       `gorm:"size:500" json:"file_path,omitempty"`
	FileType  string       `gorm:"size:20" json:"file_type,omitempty"` // pdf, docx, text, form
	RawText   string       `gorm:"type:longtext" json:"raw_text,omitempty"`
	Status    ResumeStatus `gorm:"type:enum('pending','processing','ready','failed');default:'pending'" json:"status"`
	CreatedAt time.Time    `json:"created_at"`
	UpdatedAt time.Time    `json:"updated_at"`
}

type Analysis struct {
	ID             uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	ResumeID       uint      `gorm:"not null;index" json:"resume_id"`
	UserID         uint      `gorm:"not null;index" json:"user_id"`
	TotalScore     int       `json:"total_score"`
	DetailScores   string    `gorm:"type:json" json:"detail_scores"`   // JSON
	Issues         string    `gorm:"type:json" json:"issues"`         // JSON array
	Suggestions    string    `gorm:"type:json" json:"suggestions"`    // JSON array
	JDText         string    `gorm:"type:text" json:"jd_text,omitempty"`
	JDMatchScore   int       `json:"jd_match_score,omitempty"`
	JDMissingKeys  string    `gorm:"type:json" json:"jd_missing_keys,omitempty"` // JSON array
	ModelUsed      string    `gorm:"size:50" json:"model_used"`
	CreatedAt      time.Time `json:"created_at"`
}

type ResumeVersion struct {
	ID              uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	ResumeID        uint      `gorm:"not null;index" json:"resume_id"`
	Version         int       `gorm:"not null" json:"version"`
	ContentSnapshot string    `gorm:"type:longtext" json:"content_snapshot"`
	AnalysisID      uint      `json:"analysis_id,omitempty"`
	CreatedAt       time.Time `json:"created_at"`
}

type SubscriptionStatus string

const (
	SubStatusActive   SubscriptionStatus = "active"
	SubStatusExpired  SubscriptionStatus = "expired"
	SubStatusCanceled SubscriptionStatus = "canceled"
)

type Subscription struct {
	ID        uint               `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID    uint               `gorm:"not null;uniqueIndex" json:"user_id"`
	Plan      string             `gorm:"size:50;default:'free'" json:"plan"`
	Status    SubscriptionStatus `gorm:"type:enum('active','expired','canceled');default:'active'" json:"status"`
	StartAt   time.Time          `json:"start_at"`
	EndAt     *time.Time         `json:"end_at,omitempty"`
	CreatedAt time.Time          `json:"created_at"`
	UpdatedAt time.Time          `json:"updated_at"`
}

type VerificationCode struct {
	ID        uint      `gorm:"primaryKey;autoIncrement"`
	Email     string    `gorm:"index;size:255;not null"`
	Code      string    `gorm:"size:6;not null"`
	ExpiresAt time.Time `gorm:"not null"`
	Used      bool      `gorm:"default:false"`
	CreatedAt time.Time
}

type OrderStatus string

const (
	OrderStatusPending  OrderStatus = "pending"
	OrderStatusPaid     OrderStatus = "paid"
	OrderStatusCanceled OrderStatus = "canceled"
)

type Order struct {
	ID        uint        `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID    uint        `gorm:"not null;index" json:"user_id"`
	Plan      string      `gorm:"size:50;not null" json:"plan"` // "pro_monthly", "pro_yearly"
	Amount    int         `gorm:"not null" json:"amount"`       // in cents (¥)
	Status    OrderStatus `gorm:"type:enum('pending','paid','canceled');default:'pending'" json:"status"`
	CreatedAt time.Time   `json:"created_at"`
	UpdatedAt time.Time   `json:"updated_at"`
}
