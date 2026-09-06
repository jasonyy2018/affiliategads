# scripts/ — 已迁移至原生 TypeScript 引擎

> **2026-09 迁移说明**：本目录的 13 个 Python 脚本已全部移植为原生 TypeScript，
> 位于 `lib/automation/`，由管理后台 (`/admin` → 自动化调度台) 或
> `POST /api/admin/run-task` 统一调度执行。

## 迁移对照表

| Python 脚本 | TS 引擎 | 任务 key |
|---|---|---|
| cron_runner.py | lib/automation/index.ts | cron_pipeline |
| epc_tracker.py | lib/automation/epcTracker.ts | epc_tracker |
| geo_optimizer.py | lib/automation/geoOptimizer.ts | geo_optimizer |
| serp_tracker.py | lib/automation/serpTracker.ts | serp_tracker |
| gemini_live_checker.py | lib/automation/geminiAudit.ts | gemini_audit |
| trust_syndicate.py | lib/automation/trustSyndicate.ts | trust_syndicate |
| bing_submit.py | lib/automation/bingSubmit.ts | bing_submit |
| gsc_monitor.py | lib/automation/gscMonitor.ts | gsc_monitor |
| pseo_generator.py | lib/automation/pseoGenerator.ts | pseo_generate |
| generate_content.py | lib/automation/contentGenerator.ts | content_generate |
| daily_report.py | lib/automation/dailyReport.ts | daily_report |
| social_dispatcher.py | lib/automation/socialDispatch.ts | social_dispatch |
| regenerate_english_reviews.py | lib/automation/contentGenerator.ts | content_generate |

## 保留原因

- **requirements.txt / *.py**：留作 TS 移植的逻辑参考与回滚备份。站点运行**不再依赖
  Python**，Docker 镜像也不再安装。
- 如确认无需回滚，可整体删除本目录。
