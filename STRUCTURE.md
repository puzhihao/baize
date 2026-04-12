baize/
├── docker-compose.yml      # 一键启动所有服务
├── .env.example            # 环境变量示例
│
├── backend/                # Golang API 服务
│   ├── cmd/server/main.go  # 入口，路由注册
│   ├── internal/
│   │   ├── config/         # 配置加载（.env）
│   │   ├── database/       # MySQL 连接 + AutoMigrate
│   │   ├── handler/        # HTTP handlers (auth, resume)
│   │   ├── middleware/      # JWT 验证
│   │   ├── model/          # GORM 数据模型
│   │   └── service/        # 业务逻辑 (auth, resume+AI)
│   ├── pkg/
│   │   ├── ai/             # 多模型适配器
│   │   │   ├── interface.go    # Provider interface
│   │   │   ├── manager.go      # 路由/切换逻辑
│   │   │   ├── deepseek.go
│   │   │   ├── openai.go
│   │   │   └── claude.go
│   │   └── parser/         # PDF/DOCX 文本提取
│   ├── Dockerfile
│   └── .env.example
│
└── frontend/               # React 18 SPA
    ├── src/
    │   ├── App.tsx          # 路由配置
    │   ├── pages/
    │   │   ├── Landing.tsx  # 落地页（Hero + 功能 + 定价）
    │   │   ├── Auth.tsx     # 登录/注册（共用组件）
    │   │   ├── Dashboard.tsx # 用户主页（简历列表）
    │   │   ├── Upload.tsx   # 上传（文件/文本/表单）
    │   │   └── Analysis.tsx # 分析结果（评分环+雷达图+建议）
    │   ├── services/api.ts  # Axios + API 封装
    │   ├── store/auth.ts    # Zustand JWT 状态
    │   └── utils/date.ts
    ├── Dockerfile
    └── nginx.conf
