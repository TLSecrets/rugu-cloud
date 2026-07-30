export function renderGuide(el) {
  el.innerHTML = `
    <header class="page-header">
      <h1 class="page-header__title">使用手册</h1>
      <p class="page-header__desc">如故云题库：界面与交互对齐本地「如故」，数据在 Cloudflare D1。</p>
    </header>
    <div class="guide">
      <section class="card" id="overview">
        <h3 class="card__title">概览</h3>
        <p>需要登录。题库、收藏、笔记、错题与设置按账号保存在云端，可多端同步。</p>
        <ul>
          <li>题型：单选、多选、判断、填空、简答</li>
          <li>练习、不限时模拟考试、搜索、收藏、笔记、错题本</li>
          <li>导入导出：JSON 批量；可选 DeepSeek AI 辅助整理；PDF 可用浏览器打印</li>
        </ul>
      </section>
      <section class="card">
        <h3 class="card__title">题库与标签</h3>
        <p>在「题库」页可新建、编辑、删除私有题库；管理员可建公共库。标签筛选支持「或 / 与」运算（见设置）。</p>
      </section>
      <section class="card">
        <h3 class="card__title">练习与考试</h3>
        <ul>
          <li>练习：选题库、可打乱顺序，提交后即时判分；错题自动记入错题本</li>
          <li>考试：按题型数量组卷，交卷后查看正确率与逐题结果</li>
        </ul>
      </section>
      <section class="card">
        <h3 class="card__title">导入与 AI</h3>
        <p>「导入导出」支持如故 generated JSON。AI 需在设置中填写 DeepSeek API Key，由服务端代理请求。</p>
      </section>
      <section class="card">
        <h3 class="card__title">与本地版差异</h3>
        <ul>
          <li>不再使用浏览器 IndexedDB；需网络与登录</li>
          <li>账号隔离：看不到他人私有题库</li>
          <li>媒体大图托管能力有限，以文本题为主</li>
        </ul>
      </section>
    </div>`
}
