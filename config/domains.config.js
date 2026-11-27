// config/domains.config.js — 域名锁配置（唯一可改处）
export const DOMAINS = {
  // 仅这些域名可正常运行；localhost / 127.0.0.1 / file:// 视为本地调试
  allowed: ["pipygames.com", "localhost", "127.0.0.1"],
  // 命中非授权域名后跳转的目标
  redirect: "https://pipygames.com/",
  // 非授权域名下运行多久后跳转（毫秒）
  delay: 3000,
  // 子域是否放行（www 放行，其它子域按主域匹配）
  allowSubdomains: true
};
