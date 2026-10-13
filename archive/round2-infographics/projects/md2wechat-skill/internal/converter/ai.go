package converter

import (
	"fmt"
	"strings"

	"github.com/geekjourneyx/md2wechat-skill/internal/action"
	"go.uber.org/zap"
)

const aiModePrefix = "AI_MODE_REQUEST:"

// AIConvertRequest AI 转换请求（用于传递给 Claude）
type AIConvertRequest struct {
	Markdown     string // Markdown 内容
	Prompt       string // 完整的提示词
	Theme        string // 主题名称
	CustomPrompt string // 自定义提示词（如果有）
}

// AIConvertResult AI 转换结果
type AIConvertResult struct {
	HTML    string
	Success bool
	Error   string
}

// aiConverter AI 模式转换器
type aiConverter struct {
	log   *zap.Logger
	theme *ThemeManager
}

// NewAIConverter 创建 AI 转换器
func NewAIConverter(log *zap.Logger, theme *ThemeManager) *aiConverter {
	return &aiConverter{
		log:   log,
		theme: theme,
	}
}

// convertViaAI 通过 AI 模式执行转换
// 注意：实际的 AI 调用由外部（Claude）执行，此方法准备请求结构
func (c *converter) convertViaAI(req *ConvertRequest) *ConvertResult {
	result := &ConvertResult{
		Mode:      ModeAI,
		Theme:     req.Theme,
		Status:    action.StatusActionRequired,
		Action:    action.ActionConvert,
		Retryable: false,
		Success:   true,
	}

	// 获取提示词
	prompt, err := c.buildAIPrompt(req)
	if err != nil {
		result.Status = action.StatusFailed
		result.Action = action.ActionConvert
		result.Retryable = false
		result.Success = false
		result.Error = fmt.Sprintf("build AI prompt failed: %s", err.Error())
		return result
	}

	// 提取图片引用
	images := c.ExtractImages(req.Markdown)

	// AI 模式由外部调用者处理，这里返回准备好的请求
	// 实际使用时，调用者应该：
	// 1. 获取 AIConvertRequest
	// 2. 发送给 Claude
	// 3. 获取返回的 HTML
	// 4. 调用 CompleteAIConversion 填充结果

	// 为了保持接口一致性，这里返回一个包含提示词的特殊结果
	result.Prompt = prompt
	result.Error = aiModePrefix + prompt
	result.Images = images

	c.log.Info("AI conversion request prepared",
		zap.String("theme", req.Theme),
		zap.Int("image_count", len(images)),
		zap.Int("prompt_length", len(prompt)))

	return result
}

// buildAIPrompt 构建 AI 提示词
func (c *converter) buildAIPrompt(req *ConvertRequest) (string, error) {
	var prompt string
	doc := ParseArticleDocument(req.Markdown)
	markdown := doc.Body
	metadata := doc.Metadata
	metadata.Title = firstNonEmpty(req.Metadata.Title, metadata.Title)
	metadata.Author = firstNonEmpty(req.Metadata.Author, metadata.Author)
	metadata.Digest = firstNonEmpty(req.Metadata.Digest, metadata.Digest)

	// 如果有自定义提示词，使用自定义
	if req.CustomPrompt != "" {
		prompt = BuildCustomAIPrompt(req.CustomPrompt)
	} else {
		// 否则使用内置主题的提示词
		theme, err := c.theme.ResolveThemeForMode(ModeAI, req.Theme)
		if err != nil {
			return "", err
		}

		// 使用 PromptBuilder 构建完整 Prompt
		vars := map[string]string{
			"TITLE": metadata.Title,
		}
		prompt, err = c.promptBuilder.BuildPromptFromTheme(theme, markdown, vars)
		if err != nil {
			c.log.Warn("build prompt from theme failed, using raw prompt", zap.Error(err))
			prompt = theme.Prompt + "\n\n```\n" + markdown + "\n```"
		} else {
			// 验证 Prompt 内容
			validation := ValidatePromptContent(prompt)
			if !validation.Valid {
				c.log.Warn("prompt validation failed",
					zap.Strings("errors", validation.Errors))
			}
			if len(validation.Warnings) > 0 {
				c.log.Debug("prompt validation warnings",
					zap.Strings("warnings", validation.Warnings))
			}
		}
		return prompt, nil
	}

	// 添加 Markdown 内容
	fullPrompt := prompt + "\n\n```\n" + markdown + "\n```"

	return fullPrompt, nil
}

// PrepareAIRequest 准备 AI 转换请求（供外部调用）
func (c *converter) PrepareAIRequest(req *ConvertRequest) (*AIConvertRequest, error) {
	prompt, err := c.buildAIPrompt(req)
	if err != nil {
		return nil, err
	}
	doc := ParseArticleDocument(req.Markdown)

	return &AIConvertRequest{
		Markdown:     doc.Body,
		Prompt:       prompt,
		Theme:        req.Theme,
		CustomPrompt: req.CustomPrompt,
	}, nil
}

// CompleteAIConversion 完成 AI 转换（由外部调用 AI 后使用）
func CompleteAIConversion(html string, images []ImageRef, theme string) *ConvertResult {
	return &ConvertResult{
		HTML:    html,
		Mode:    ModeAI,
		Theme:   theme,
		Images:  images,
		Status:  action.StatusCompleted,
		Action:  action.ActionConvert,
		Success: true,
	}
}

// IsAIRequest 检查结果是否是 AI 请求
func IsAIRequest(result *ConvertResult) bool {
	if result == nil {
		return false
	}
	if result.Status != "" {
		return result.Status == action.StatusActionRequired
	}
	if result.Prompt != "" {
		return true
	}
	return strings.HasPrefix(result.Error, aiModePrefix)
}

// ExtractAIRequest 从结果中提取 AI 请求
func ExtractAIRequest(result *ConvertResult) string {
	if result == nil {
		return ""
	}
	if result.Status != "" {
		if result.Status == action.StatusActionRequired {
			return result.Prompt
		}
		return ""
	}
	if result.Prompt != "" {
		return result.Prompt
	}
	if strings.HasPrefix(result.Error, aiModePrefix) {
		return strings.TrimPrefix(result.Error, aiModePrefix)
	}
	return ""
}

// GetAIRequestInfo 获取 AI 请求的详细信息
func GetAIRequestInfo(result *ConvertResult) (prompt string, images []ImageRef, ok bool) {
	if !IsAIRequest(result) {
		return "", nil, false
	}
	return ExtractAIRequest(result), result.Images, true
}
