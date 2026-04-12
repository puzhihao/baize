package handler

import (
	"net/http"
	"strconv"
	"time"

	"github.com/baize/backend/internal/database"
	"github.com/baize/backend/internal/model"
	"github.com/gin-gonic/gin"
)

// plan → amount in fen (1 CNY = 100 fen)
var planPrices = map[string]int{
	"pro_monthly": 2900,  // ¥29/月
	"pro_yearly":  19900, // ¥199/年
}

// planDurations maps plan to subscription duration
var planDurations = map[string]time.Duration{
	"pro_monthly": 30 * 24 * time.Hour,
	"pro_yearly":  365 * 24 * time.Hour,
}

type PaymentHandler struct{}

func NewPaymentHandler() *PaymentHandler { return &PaymentHandler{} }

// CreateOrder POST /api/payment/orders
// @Summary 创建升级订单
// @Tags payment
// @Accept json
// @Produce json
// @Param body body object{plan=string} true "订阅计划: pro_monthly | pro_yearly"
// @Success 201 {object} model.Order
// @Failure 400 {object} map[string]string
// @Router /payment/orders [post]
func (h *PaymentHandler) CreateOrder(c *gin.Context) {
	userID := c.GetUint("user_id")

	var req struct {
		Plan string `json:"plan" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请指定订阅计划"})
		return
	}

	amount, ok := planPrices[req.Plan]
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的订阅计划"})
		return
	}

	order := model.Order{
		UserID: userID,
		Plan:   req.Plan,
		Amount: amount,
		Status: model.OrderStatusPending,
	}
	if err := database.DB.Create(&order).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建订单失败"})
		return
	}
	c.JSON(http.StatusCreated, order)
}

// ConfirmPayment POST /api/payment/orders/:id/confirm
// @Summary 确认支付并升级账号
// @Tags payment
// @Produce json
// @Param id path int true "订单 ID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Router /payment/orders/{id}/confirm [post]
func (h *PaymentHandler) ConfirmPayment(c *gin.Context) {
	userID := c.GetUint("user_id")
	orderID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的订单 ID"})
		return
	}

	var order model.Order
	if err := database.DB.Where("id = ? AND user_id = ?", orderID, userID).First(&order).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "订单不存在"})
		return
	}
	if order.Status == model.OrderStatusPaid {
		c.JSON(http.StatusBadRequest, gin.H{"error": "该订单已完成支付"})
		return
	}
	if order.Status == model.OrderStatusCanceled {
		c.JSON(http.StatusBadRequest, gin.H{"error": "该订单已取消"})
		return
	}

	// Mark order paid
	if err := database.DB.Model(&order).Update("status", model.OrderStatusPaid).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "更新订单状态失败"})
		return
	}

	// Upgrade user tier
	if err := database.DB.Model(&model.User{}).Where("id = ?", userID).
		Update("tier", model.TierPro).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "升级账号失败"})
		return
	}

	// Upsert subscription
	dur := planDurations[order.Plan]
	now := time.Now()
	endAt := now.Add(dur)

	var sub model.Subscription
	result := database.DB.Where("user_id = ?", userID).First(&sub)
	if result.Error != nil {
		// create
		sub = model.Subscription{
			UserID:  userID,
			Plan:    order.Plan,
			Status:  model.SubStatusActive,
			StartAt: now,
			EndAt:   &endAt,
		}
		database.DB.Create(&sub)
	} else {
		// extend from now if already expired, or from current end_at if still active
		start := now
		if sub.EndAt != nil && sub.EndAt.After(now) {
			start = *sub.EndAt
		}
		newEnd := start.Add(dur)
		database.DB.Model(&sub).Updates(map[string]any{
			"plan":    order.Plan,
			"status":  model.SubStatusActive,
			"end_at":  newEnd,
			"start_at": now,
		})
	}

	c.JSON(http.StatusOK, gin.H{"message": "支付成功，已升级为专业版"})
}
