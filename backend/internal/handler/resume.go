package handler

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"

	apperrors "github.com/baize/backend/internal/errors"
	"github.com/baize/backend/internal/service"
	"github.com/gin-gonic/gin"
)

type ResumeHandler struct {
	svc *service.ResumeService
}

func NewResumeHandler(svc *service.ResumeService) *ResumeHandler {
	return &ResumeHandler{svc: svc}
}

func (h *ResumeHandler) Upload(c *gin.Context) {
	userID := c.GetUint("user_id")
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请选择要上传的文件"})
		return
	}
	defer file.Close()

	data, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "读取文件失败"})
		return
	}

	resume, err := h.svc.UploadFile(service.UploadFileRequest{
		UserID:   userID,
		FileName: header.Filename,
		Data:     data,
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, resume)
}

func (h *ResumeHandler) CreateFromText(c *gin.Context) {
	userID := c.GetUint("user_id")
	var body struct {
		Title string `json:"title" binding:"required"`
		Text  string `json:"text" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	resume, err := h.svc.CreateFromText(userID, body.Title, body.Text)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, resume)
}

func (h *ResumeHandler) List(c *gin.Context) {
	userID := c.GetUint("user_id")
	resumes, err := h.svc.ListByUser(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"resumes": resumes})
}

func (h *ResumeHandler) Get(c *gin.Context) {
	userID := c.GetUint("user_id")
	var uri struct{ ID uint `uri:"id"` }
	if err := c.ShouldBindUri(&uri); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的ID"})
		return
	}
	resume, err := h.svc.GetByID(uri.ID, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, resume)
}

func (h *ResumeHandler) AnalyzeStream(c *gin.Context) {
	userID := c.GetUint("user_id")
	var uri struct{ ID uint `uri:"id"` }
	if err := c.ShouldBindUri(&uri); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的ID"})
		return
	}
	var body struct {
		JDText string `json:"jd_text"`
		Model  string `json:"model"`
	}
	c.ShouldBindJSON(&body)

	ch, err := h.svc.AnalyzeStream(c.Request.Context(), service.AnalyzeRequest{
		ResumeID: uri.ID,
		UserID:   userID,
		JDText:   body.JDText,
		Model:    body.Model,
	})
	if err != nil {
		status := http.StatusInternalServerError
		if errors.Is(err, apperrors.ErrQuotaExceeded) {
			status = http.StatusPaymentRequired
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}

	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no")

	c.Stream(func(w io.Writer) bool {
		event, ok := <-ch
		if !ok {
			return false
		}
		switch event.Type {
		case "token":
			c.SSEvent("token", event.Token)
		case "result":
			data, _ := json.Marshal(event.Analysis)
			c.SSEvent("result", string(data))
			return false
		case "error":
			c.SSEvent("error", event.ErrMsg)
			return false
		}
		return true
	})
}

func (h *ResumeHandler) Analyze(c *gin.Context) {	userID := c.GetUint("user_id")
	var uri struct{ ID uint `uri:"id"` }
	if err := c.ShouldBindUri(&uri); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的ID"})
		return
	}
	var body struct {
		JDText string `json:"jd_text"`
		Model  string `json:"model"`
	}
	c.ShouldBindJSON(&body)

	analysis, err := h.svc.Analyze(c.Request.Context(), service.AnalyzeRequest{
		ResumeID: uri.ID,
		UserID:   userID,
		JDText:   body.JDText,
		Model:    body.Model,
	})
	if err != nil {
		status := http.StatusInternalServerError
		if errors.Is(err, apperrors.ErrQuotaExceeded) {
			status = http.StatusPaymentRequired
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, analysis)
}

func (h *ResumeHandler) GenerateStream(c *gin.Context) {
	userID := c.GetUint("user_id")
	var body struct {
		Name       string `json:"name" binding:"required"`
		Phone      string `json:"phone"`
		Email      string `json:"email"`
		Position   string `json:"position" binding:"required"`
		Education  string `json:"education"`
		Experience string `json:"experience"`
		Skills     string `json:"skills"`
		Projects   string `json:"projects"`
		JDText     string `json:"jd_text"`
		Model      string `json:"model"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ch, err := h.svc.StreamGenerate(c.Request.Context(), service.GenerateRequest{
		UserID:     userID,
		Name:       body.Name,
		Phone:      body.Phone,
		Email:      body.Email,
		Position:   body.Position,
		Education:  body.Education,
		Experience: body.Experience,
		Skills:     body.Skills,
		Projects:   body.Projects,
		JDText:     body.JDText,
		Model:      body.Model,
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no")

	c.Stream(func(w io.Writer) bool {
		token, ok := <-ch
		if !ok {
			c.SSEvent("done", "")
			return false
		}
		c.SSEvent("token", token)
		return true
	})
}

func (h *ResumeHandler) StreamSuggestions(c *gin.Context) {
	userID := c.GetUint("user_id")
	var uri struct{ ID uint `uri:"id"` }
	if err := c.ShouldBindUri(&uri); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的ID"})
		return
	}

	jdText := c.Query("jd_text")
	modelName := c.Query("model")

	ch, err := h.svc.StreamSuggestions(c.Request.Context(), uri.ID, userID, jdText, modelName)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no")

	c.Stream(func(w io.Writer) bool {
		token, ok := <-ch
		if !ok {
			c.SSEvent("done", "")
			return false
		}
		c.SSEvent("token", token)
		return true
	})
}

func (h *ResumeHandler) ListAnalyses(c *gin.Context) {
	userID := c.GetUint("user_id")
	items, err := h.svc.ListAnalysesByUser(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"analyses": items})
}

func (h *ResumeHandler) Delete(c *gin.Context) {
	userID := c.GetUint("user_id")
	var uri struct{ ID uint `uri:"id"` }
	if err := c.ShouldBindUri(&uri); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的ID"})
		return
	}
	if err := h.svc.DeleteResume(c.Request.Context(), uri.ID, userID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *ResumeHandler) GetAnalysis(c *gin.Context) {
	userID := c.GetUint("user_id")
	var uri struct{ ID uint `uri:"id"` }
	if err := c.ShouldBindUri(&uri); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的ID"})
		return
	}
	analysis, err := h.svc.GetAnalysis(uri.ID, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, analysis)
}

func (h *ResumeHandler) DeleteAnalysis(c *gin.Context) {
	userID := c.GetUint("user_id")
	var uri struct{ ID uint `uri:"id"` }
	if err := c.ShouldBindUri(&uri); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的ID"})
		return
	}
	if err := h.svc.DeleteAnalysis(uri.ID, userID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *ResumeHandler) ListVersions(c *gin.Context) {	userID := c.GetUint("user_id")
	var uri struct{ ID uint `uri:"id"` }
	if err := c.ShouldBindUri(&uri); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的ID"})
		return
	}

	versions, err := h.svc.ListVersions(uri.ID, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"versions": versions})
}
