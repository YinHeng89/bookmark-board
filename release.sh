#!/bin/bash
#
# 书签白板 - 一键发布脚本
#
# 用法:
#   ./release.sh 3.2.7          # 发布指定版本
#   ./release.sh                # 显示当前版本信息
#
# 功能:
#   1. 更新 manifest.json 版本号
#   2. 生成发布 zip 包 (releases/ 目录)
#   3. 显示发布清单确认

set -e

# ── 颜色 ──────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ── 路径 ──────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MANIFEST="$SCRIPT_DIR/manifest.json"
RELEASES_DIR="$SCRIPT_DIR/releases"

# ── 帮助 ──────────────────────────────────────────────
show_help() {
  echo "用法: ./release.sh <版本号>"
  echo ""
  echo "示例:"
  echo "  ./release.sh 3.2.7    发布 3.2.7 版本"
  echo "  ./release.sh          查看当前版本信息"
  echo ""
  echo "版本号格式: x.y.z (数字)"
}

# ── 读取当前版本 ──────────────────────────────────────
get_current_version() {
  if [[ ! -f "$MANIFEST" ]]; then
    echo -e "${RED}错误: 找不到 manifest.json${NC}"
    exit 1
  fi
  grep '"version"' "$MANIFEST" | sed 's/.*"version": *"\([^"]*\)".*/\1/'
}

# ── 验证版本号 ────────────────────────────────────────
validate_version() {
  if [[ ! $1 =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo -e "${RED}错误: 版本号格式无效，应为 x.y.z (如 3.2.7)${NC}"
    exit 1
  fi
}

# ── 更新所有文件中的版本号 ────────────────────────────
update_version() {
  local new_version="$1"
  local current_version=$(get_current_version)

  if [[ "$new_version" == "$current_version" ]]; then
    echo -e "${YELLOW}⚠ 版本号未变化: $current_version${NC}"
    return
  fi

  # sed 兼容 macOS 和 Linux
  if [[ "$OSTYPE" == "darwin"* ]]; then
    SED_INLINE=(sed -i '')
  else
    SED_INLINE=(sed -i)
  fi

  # 1. manifest.json
  "${SED_INLINE[@]}" "s/\"version\": *\"$current_version\"/\"version\": \"$new_version\"/" "$MANIFEST"

  # 2. new-tab.html（Logo 版本 + CSS 缓存刷新）
  "${SED_INLINE[@]}" "s/$current_version/$new_version/g" "$SCRIPT_DIR/new-tab.html"

  # 3. settings.html（关于页面版本号）
  "${SED_INLINE[@]}" "s/$current_version/$new_version/g" "$SCRIPT_DIR/settings.html"

  # 4. js/settings.js（导出数据版本标记）
  "${SED_INLINE[@]}" "s/$current_version/$new_version/g" "$SCRIPT_DIR/js/settings.js"

  echo -e "${GREEN}✓ 版本号: $current_version → $new_version"
  echo -e "  • manifest.json"
  echo -e "  • new-tab.html（Logo / CSS缓存）"
  echo -e "  • settings.html（关于页面）"
  echo -e "  • js/settings.js（导出数据）${NC}"
}

# ── 打包发布 ──────────────────────────────────────────
create_release() {
  local version="$1"

  mkdir -p "$RELEASES_DIR"

  local zip_file="$RELEASES_DIR/bookmark-board-v$version.zip"

  if [[ -f "$zip_file" ]]; then
    echo -e "${YELLOW}⚠ 已存在: $zip_file${NC}"
    read -p "  覆盖？(Y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Nn]$ ]]; then
      echo -e "${YELLOW}已取消打包${NC}"
      exit 0
    fi
    rm "$zip_file"
  fi

  echo -e "${BLUE}📦 正在打包...${NC}"

  # 进入项目目录，用 file list 确保只包含需要的文件
  cd "$SCRIPT_DIR"

  zip -r "$zip_file" \
    manifest.json \
    new-tab.html \
    sidebar.html \
    settings.html \
    default-icon.png \
    _locales/ \
    css/ \
    js/ \
    fonts/ \
    icons/ \
    -x "*.DS_Store" \
    -x "*__MACOSX*" \
    -x "*.git/*" \
    > /dev/null

  local size=$(du -h "$zip_file" | cut -f1)
  echo -e "${GREEN}✓ 发布包已生成: $zip_file (${size})${NC}"
}

# ── 显示发布确认清单 ──────────────────────────────────
show_summary() {
  local version="$1"
  local current_version=$(get_current_version)

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo -e " ${GREEN}发布准备就绪!${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo -e "  版本号:    ${BLUE}$version${NC}"
  echo -e "  发布包:    ${BLUE}releases/bookmark-board-v$version.zip${NC}"
  echo ""
  echo -e " ${YELLOW}接下来你需要：${NC}"
  echo "  1. 访问 https://chrome.google.com/webstore/devconsole/"
  echo "  2. 选择「书签白板」"
  echo "  3. 上传 releases/bookmark-board-v$version.zip"
  echo "  4. 填写更新说明"
  echo "  5. 提交审核"
  echo ""
  echo -e " ${YELLOW}别忘了：${NC}"
  echo "  • git add . && git commit -m \"v$version\""
  echo "  • git tag v$version && git push --tags"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
}

# ── 主流程 ────────────────────────────────────────────
main() {
  echo ""
  echo -e "${BLUE}╔══════════════════════════╗${NC}"
  echo -e "${BLUE}║   书签白板 - 发布工具   ║${NC}"
  echo -e "${BLUE}╚══════════════════════════╝${NC}"
  echo ""

  if [[ $# -eq 0 ]]; then
    local current_version=$(get_current_version)
    echo -e "当前版本: ${GREEN}$current_version${NC}"
    echo ""
    show_help
    exit 0
  fi

  local version="$1"

  # 验证
  validate_version "$version"

  echo -e "发布版本: ${BLUE}$version${NC}"
  echo ""

  # 确认
  read -p "确认发布 v$version？(Y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Nn]$ ]]; then
    echo -e "${YELLOW}已取消发布${NC}"
    exit 0
  fi

  # 执行
  update_version "$version"
  create_release "$version"
  show_summary "$version"
}

main "$@"
