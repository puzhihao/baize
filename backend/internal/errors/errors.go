package errors

import "errors"

var (
	ErrQuotaExceeded = errors.New("quota_exceeded")
	ErrNotFound      = errors.New("not_found")
	ErrUnauthorized  = errors.New("unauthorized")
)
