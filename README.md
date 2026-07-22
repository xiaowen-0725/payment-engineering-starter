# Payment Engineering Starter

这是一个精简的支付编排服务，也是研发实战题的起始项目。实战同时包含生产问题处理和多支付渠道架构演进。

请先阅读 [`TASK.md`](./TASK.md)，再开始调查和修改。

## 创建你的提交仓库

如果当前地址是母题仓库 `xiaowen-0725/payment-engineering-starter`，请不要直接在母题仓库上修改：

1. 点击 GitHub 页面上的 **Use this template**；
2. 选择 **Create a new repository**；
3. 在你自己的 GitHub 账号下创建一个新的公开仓库；
4. 将新仓库拉取到本地，在新仓库中完成全部修改和文档；
5. 完成后向面试官提交新仓库地址和截止时间内的最终 commit hash。

如果你查看的已经是自己创建的仓库，可以直接继续下面的步骤。

## 运行环境

- Node.js 20 或更高版本
- npm 10 或兼容版本

```bash
npm ci
npm test
npm run typecheck
```

启动本地服务：

```bash
PAY_WEBHOOK_SECRET=local-test-secret npm start
```

默认监听 `4000` 端口。

## 项目结构

```text
src/
  http/          HTTP 路由与输入校验
  payments/      支付领域服务、状态机和存储接口
  providers/     支付渠道接口和测试替身
  webhooks/      Webhook 验签和事件处理
  dead-letter/   最小化失败记录
test/            当前已有测试
```

## 实战规则

- 正式操作时间为 60 分钟，可以提前提交。
- 可以自由使用 Cursor、Claude Code、Codex 或其他 AI 工具。
- 不允许删除、跳过或弱化已有测试。
- 不允许修改测试命令来掩盖失败。
- 不要求解决发现的所有问题；安全的部分修复和清楚的风险说明同样有价值。

## 提交要求

1. 将原项目、代码修改、新增测试和文档一起保存在你创建的公开仓库中。
2. 增加能够证明生产问题修复及多渠道关键行为的测试。
3. 完整填写 [`SUBMISSION.md`](./SUBMISSION.md)。
4. 推送最终代码，并通过飞书提交仓库地址和最终 commit hash。
5. AI 对话截图或导出记录通过飞书单独提交，不要放进公开仓库。

评分以规定时间内提交的最终 commit 为准，后续提交不会纳入本次结果。

## 许可

基础代码基于 MIT 许可项目改编，原版权和许可文本见 [`LICENSE`](./LICENSE)。
