// 全局 CSS 动画和样式
export const globalStyles = `
  /* 基础动画 */
  @keyframes marquee-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
  @keyframes fadeInDown { 0% { opacity: 0; transform: translate(-50%, -20px); } 100% { opacity: 1; transform: translate(-50%, 0); } }
  @keyframes fadeInUp { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
  @keyframes fadeInScale { 0% { opacity: 0; transform: scale(0.9); } 100% { opacity: 1; transform: scale(1); } }
  @keyframes bounceIn { 0% { opacity: 0; transform: scale(0.3); } 50% { opacity: 1; transform: scale(1.05); } 70% { transform: scale(0.95); } 100% { transform: scale(1); } }
  @keyframes slideDown { 0% { opacity: 0; max-height: 0; transform: translateY(-10px); } 100% { opacity: 1; max-height: 500px; transform: translateY(0); } }
  @keyframes slideInRight { 0% { opacity: 0; transform: translateX(30px); } 100% { opacity: 1; transform: translateX(0); } }
  @keyframes pulse-glow { 0%, 100% { box-shadow: 0 0 5px rgba(59, 130, 246, 0.5); } 50% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.8), 0 0 30px rgba(59, 130, 246, 0.4); } }
  @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
  @keyframes rotateIn { 0% { opacity: 0; transform: rotate(-10deg) scale(0.9); } 100% { opacity: 1; transform: rotate(0) scale(1); } }

  /* 动画类 */
  .animate-scroll-text { animation: marquee-scroll 6s linear infinite; min-width: fit-content; display: flex; }
  .animate-fade-in-up { animation: fadeInUp 0.5s ease-out forwards; }
  .animate-fade-in-scale { animation: fadeInScale 0.4s ease-out forwards; }
  .animate-bounce-in { animation: bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards; }
  .animate-slide-down { animation: slideDown 0.4s ease-out forwards; overflow: hidden; }
  .animate-slide-in-right { animation: slideInRight 0.4s ease-out forwards; }
  .animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
  .animate-float { animation: float 3s ease-in-out infinite; }
  .animate-rotate-in { animation: rotateIn 0.4s ease-out forwards; }

  /* 卡片效果 */
  .card-hover { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
  .card-hover:hover { transform: translateY(-4px) scale(1.02); }
  .btn-press { transition: transform 0.15s ease; }
  .btn-press:active { transform: scale(0.95); }

  /* 延迟动画 */
  .stagger-1 { animation-delay: 0.05s; }
  .stagger-2 { animation-delay: 0.1s; }
  .stagger-3 { animation-delay: 0.15s; }
  .stagger-4 { animation-delay: 0.2s; }
  .stagger-5 { animation-delay: 0.25s; }

  /* 滚动条 */
  .custom-scrollbar::-webkit-scrollbar { width: 4px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 4px; }

  /* 分组收起/展开 */
  .group-content { transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease, padding 0.3s ease; overflow: hidden; }
  .group-content.collapsed { max-height: 0 !important; opacity: 0; padding-top: 0; padding-bottom: 0; }
  .group-content.expanded { max-height: 2000px; opacity: 1; }
  .icon-rotate { transition: transform 0.3s ease; }
  .icon-rotate.rotated { transform: rotate(180deg); }
`;
