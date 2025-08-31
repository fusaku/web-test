// 字幕管理模块 - subtitle-manager.js

class SubtitleManager {
  constructor() {
    this.subtitles = [];
    this.subtitlesVisible = true;
    this.activeSubtitles = new Set();
    this.subtitleElements = new Map();
    this.displayedSubtitles = new Map();
    this.processedSubtitles = new Set();
    this.activeSubtitleAreas = new Map();
    this.lineMoveSpeeds = new Map();
  }

  // 解析ASS时间格式
  parseASSTime(timeStr) {
    const match = timeStr.match(/(\d+):(\d+):(\d+)\.(\d+)/);
    if (!match) return null;
    return parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 +
      parseInt(match[3]) + parseInt(match[4]) / 100;
  }

  // 解析ASS字幕文件
  parseASSSubtitles(assContent) {
    const lines = assContent.split('\n');
    const subtitleLines = [];
    let inEvents = false;

    for (let line of lines) {
      line = line.trim();
      if (line === '[Events]') {
        inEvents = true;
        continue;
      }
      if (line.startsWith('[') && line !== '[Events]') {
        inEvents = false;
        continue;
      }

      if (inEvents && line.startsWith('Dialogue:')) {
        const parts = line.split(',');
        if (parts.length >= 10) {
          const startTime = this.parseASSTime(parts[1].trim());
          const endTime = this.parseASSTime(parts[2].trim());
          const style = parts[3].trim();
          const text = parts.slice(9).join(',').replace(/\\N/g, '\n').trim();

          if (text && startTime !== null && endTime !== null) {
            subtitleLines.push({
              start: startTime,
              end: endTime,
              text: text,
              style: style
            });
          }
        }
      }
    }

    return subtitleLines.sort((a, b) => a.start - b.start);
  }

  // 加载字幕文件
  async loadSubtitles(videoId) {
    try {
      console.log('Loading subtitles for:', videoId);
      const response = await fetch(`../subtitles/${videoId}.ass`);

      if (!response.ok) {
        throw new Error(window.i18n.t('subtitles.fileNotFound', `字幕文件不存在 (${response.status})`));
      }

      const assContent = await response.text();
      console.log('ASS content loaded, length:', assContent.length);

      this.subtitles = this.parseASSSubtitles(assContent);
      console.log('Parsed subtitles:', this.subtitles.length);

      if (this.subtitles.length > 0) {
        this.updateSubtitleStatus(this.subtitles.length);
        return true;
      } else {
        throw new Error(window.i18n.t('subtitles.fileEmpty', '字幕文件为空或格式不正确'));
      }
    } catch (error) {
      console.error('Subtitle loading error:', error);
      this.updateSubtitleStatus(0, error.message);
      this.subtitles = [];
      this.subtitlesVisible = false;
      return false;
    }
  }

  // 更新字幕状态显示
  updateSubtitleStatus(count, errorMessage = null) {
    const statusEl = document.getElementById('subtitle-status');
    const toggleBtn = document.getElementById('subtitle-toggle');

    if (count > 0) {
      statusEl.innerHTML = `${window.i18n.t('subtitles.status', '字幕')}: ${count} ${window.i18n.t('subtitles.loadingCount', '行')}`;
      toggleBtn.classList.remove('disabled');
      toggleBtn.textContent = window.i18n.t('subtitles.hide', '隐藏字幕');
    } else {
      statusEl.innerHTML = `${window.i18n.t('subtitles.status', '字幕')}: ${window.i18n.t('subtitles.none', '无')}`;
      toggleBtn.classList.add('disabled');
      toggleBtn.textContent = window.i18n.t('subtitles.noSubtitles', '无字幕');
    }
  }

  // 计算字幕文本宽度
  calculateSubtitleWidth(text, fontSize = 16) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.font = `600 ${fontSize}px "Segoe UI", Tahoma, Geneva, Verdana, sans-serif`;
    const metrics = context.measureText(text);
    return metrics.width;
  }

  // 检查矩形重叠
  isRectOverlapping(rect1, rect2) {
    return !(rect1.x + rect1.width < rect2.x ||
      rect2.x + rect2.width < rect1.x ||
      rect1.y + rect1.height < rect2.y ||
      rect2.y + rect2.height < rect1.y);
  }

  // 检查水平重叠
  checkHorizontalOverlap(startX, y, textWidth, textHeight, padding, line, moveSpeed) {
    const minDistance = 120;

    const newRect = {
      x: startX,
      y: y,
      width: textWidth + padding,
      height: textHeight + padding
    };

    for (const [subId, area] of this.activeSubtitleAreas.entries()) {
      const verticalOverlap = !(newRect.y + newRect.height < area.y || area.y + area.height < newRect.y);
      const currentLineSpeed = this.lineMoveSpeeds.get(line);

      if (currentLineSpeed && moveSpeed > currentLineSpeed * 1.03) {
        console.log(`速度冲突 - 当前行速度: ${currentLineSpeed}, 新字幕速度: ${moveSpeed}, 跳过第${line}行`);
        return true;
      }

      if (verticalOverlap) {
        const previousSubElement = this.subtitleElements.get(subId);
        if (previousSubElement && previousSubElement.parentNode) {
          const computedStyle = window.getComputedStyle(previousSubElement);
          const currentLeft = parseFloat(computedStyle.left) || parseFloat(previousSubElement.style.left) || area.x;
          const distanceFromRightEdge = startX - currentLeft;

          if (distanceFromRightEdge < minDistance) {
            return true;
          }

          const updatedArea = {
            x: currentLeft,
            y: area.y,
            width: area.width,
            height: area.height
          };

          if (this.isRectOverlapping(newRect, updatedArea)) {
            return true;
          }
        }
      } else {
        if (this.isRectOverlapping(newRect, area)) {
          return true;
        }
      }
    }

    return false;
  }

  // 查找可用位置
  findAvailablePosition(currentTime, textWidth, containerWidth, moveSpeed) {
    const overlay = document.getElementById('subtitle-overlay');

    let containerHeight;
    if (overlay && overlay.offsetHeight > 0) {
      containerHeight = overlay.offsetHeight;
    } else {
      const videoContainer = document.getElementById('video-container');
      if (videoContainer && videoContainer.offsetHeight > 0) {
        containerHeight = videoContainer.offsetHeight;
      } else {
        containerHeight = window.innerWidth > 768 ? 675 : window.innerHeight * 0.6;
      }
    }

    const textHeight = window.innerWidth > 768 ? 20 : 16;
    const lineHeight = window.innerWidth > 768 ? 20 : 10;
    const padding = 15;

    // 清理过期的区域记录
    for (const [subId, area] of this.activeSubtitleAreas.entries()) {
      if (currentTime > area.endTime + 0.5) {
        this.activeSubtitleAreas.delete(subId);
      }
    }

    const minLines = 8;
    const idealMaxLines = Math.floor((containerHeight - 40) / lineHeight);
    const maxLines = Math.max(minLines, idealMaxLines);
    const adjustedLineHeight = idealMaxLines < minLines ?
      Math.floor((containerHeight - 40) / minLines) : lineHeight;

    for (let line = 0; line < maxLines; line++) {
      const y = 20 + line * adjustedLineHeight;

      if (y + textHeight + 10 <= containerHeight) {
        this.lineMoveSpeeds.set(line, moveSpeed);
        if (!this.checkHorizontalOverlap(containerWidth, y, textWidth, textHeight, padding, line, moveSpeed)) {
          return {
            x: containerWidth,
            y: y,
            line: line,
            startX: containerWidth
          };
        }
      }
    }

    const forceY = Math.max(20, containerHeight - textHeight - 20);
    return {
      x: containerWidth,
      y: forceY,
      line: maxLines - 1,
      startX: containerWidth
    };
  }

  // 显示当前时间的字幕
  displayCurrentSubtitle(currentTime) {
    const overlay = document.getElementById('subtitle-overlay');

    if (!overlay || overlay.offsetHeight === 0) {
      return;
    }

    if (!this.subtitlesVisible || this.subtitles.length === 0) {
      overlay.innerHTML = '';
      this.activeSubtitles.clear();
      this.subtitleElements.clear();
      return;
    }

    // 检测时间跳跃
    if (typeof this.lastTime === 'undefined') {
      this.lastTime = currentTime;
    }

    const timeDiff = Math.abs(currentTime - this.lastTime);
    if (timeDiff > 1) {
      console.log(`Time jump detected: ${this.lastTime} -> ${currentTime}`);
      this.displayedSubtitles.clear();
    }
    this.lastTime = currentTime;

    // 获取当前应该显示的字幕
    const currentSubs = this.subtitles.filter(sub =>
      currentTime >= sub.start && currentTime <= sub.end
    );

    const currentSubIds = new Set();

    currentSubs.forEach((sub) => {
      const lines = sub.text.split('\n');
      lines.forEach((line, lineIndex) => {
        if (!line.trim()) return;

        const realSubIndex = this.subtitles.indexOf(sub);
        const subId = `sub_${realSubIndex}_${lineIndex}_${sub.start}_${sub.end}`;
        const timeKey = `${sub.start.toFixed(1)}`;

        currentSubIds.add(subId);

        if (!this.displayedSubtitles.has(timeKey)) {
          this.displayedSubtitles.set(timeKey, new Set());
        }

        const displayedAtTime = this.displayedSubtitles.get(timeKey);
        const lineKey = `${realSubIndex}_${lineIndex}`;

        if (this.activeSubtitles.has(subId) || displayedAtTime.has(lineKey)) {
          return;
        }

        displayedAtTime.add(lineKey);
        this.processedSubtitles.add(subId);
        this.activeSubtitles.add(subId);

        this.createSubtitleElement(sub, line, lineIndex, subId, overlay, currentTime);
      });
    });

    this.cleanupExpiredSubtitles(currentTime);
  }

  // 创建字幕元素
  createSubtitleElement(sub, line, lineIndex, subId, overlay, currentTime) {
    const div = document.createElement('div');
    div.className = 'danmaku-subtitle';
    div.dataset.subtitleId = subId;
    div.dataset.startTime = sub.start;
    div.dataset.endTime = sub.end;

    this.subtitleElements.set(subId, div);

    let cleanText = line;
    let moveData = null;

    // 提取移动和透明度标签
    const moveMatch = line.match(/\\move\((\d+),(\d+),(\d+),(\d+)\)/);
    const alphaMatch = line.match(/\\alpha&H([0-9A-Fa-f]+)&/);

    if (moveMatch) {
      moveData = {
        x1: parseInt(moveMatch[1]),
        y1: parseInt(moveMatch[2]),
        x2: parseInt(moveMatch[3]),
        y2: parseInt(moveMatch[4])
      };
    }

    // 设置基本样式
    this.setBasicStyles(div);

    // 设置透明度
    if (alphaMatch) {
      const alpha = parseInt(alphaMatch[1], 16);
      div.style.opacity = (255 - alpha) / 255;
    }

    if (moveData) {
      this.setupMoveAnimation(div, moveData, sub, overlay);
    } else {
      this.setupDanmakuAnimation(div, line, sub, overlay, currentTime, subId);
    }

    // 处理文本样式并设置内容
    this.applyTextStyles(div, cleanText);
    overlay.appendChild(div);
  }

  // 设置基本样式
  setBasicStyles(div) {
    div.style.position = 'absolute';
    div.style.color = '#fff';
    div.style.fontSize = '16px';
    div.style.fontWeight = '600';
    div.style.textShadow = '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 0 3px rgba(0,0,0,0.8)';
    div.style.whiteSpace = 'nowrap';
    div.style.pointerEvents = 'none';
    div.style.zIndex = '100';
  }

  // 设置移动动画
  setupMoveAnimation(div, moveData, sub, overlay) {
    const containerWidth = overlay.offsetWidth || (window.innerWidth > 768 ? 1200 : window.innerWidth);
    const containerHeight = overlay.offsetHeight || (window.innerWidth > 768 ? 675 : window.innerHeight * 0.6);
    const duration = sub.end - sub.start;

    const baseWidth = window.innerWidth > 768 ? 640 : 360;
    const baseHeight = window.innerWidth > 768 ? 360 : 200;

    const scaleX = containerWidth / baseWidth;
    const scaleY = containerHeight / baseHeight;

    const startX = Math.max(0, Math.min(moveData.x1 * scaleX, containerWidth - 100));
    const startY = Math.max(0, Math.min(moveData.y1 * scaleY, containerHeight - 30));
    const endX = Math.max(-200, Math.min(moveData.x2 * scaleX, containerWidth));
    const endY = Math.max(0, Math.min(moveData.y2 * scaleY, containerHeight - 30));

    div.style.left = `${startX}px`;
    div.style.top = `${startY}px`;
    div.style.transition = `all ${duration}s linear`;

    requestAnimationFrame(() => {
      div.style.left = `${endX}px`;
      div.style.top = `${endY}px`;
    });
  }

  // 设置弹幕动画
  setupDanmakuAnimation(div, line, sub, overlay, currentTime, subId) {
    const containerWidth = overlay.offsetWidth || (window.innerWidth > 768 ? 1200 : window.innerWidth);
    const fontSize = window.innerWidth > 768 ? 16 : 14;
    const padding = 15;

    const cleanTextForMeasure = line.replace(/\{[^}]*\}/g, '').trim();
    const textWidth = this.calculateSubtitleWidth(cleanTextForMeasure, fontSize);

    const totalMoveDistance = containerWidth + textWidth + 50;
    const pixelsPerSecond = window.innerWidth > 768 ? 180 : 150;
    const calculatedDuration = totalMoveDistance / pixelsPerSecond;

    const originalDuration = sub.end - sub.start;
    const minDuration = Math.max(3, originalDuration * 0.8);
    const maxDuration = originalDuration * 2.5;
    const finalDuration = Math.max(minDuration, Math.min(maxDuration, calculatedDuration));

    const moveSpeed = totalMoveDistance / finalDuration;
    const position = this.findAvailablePosition(currentTime, textWidth, containerWidth, moveSpeed);

    const endTime = currentTime + finalDuration;
    this.activeSubtitleAreas.set(subId, {
      x: containerWidth,
      y: position.y,
      width: textWidth + padding,
      height: (window.innerWidth > 768 ? 20 : 16) + 10,
      endTime: endTime,
      line: position.line,
      subId: subId
    });

    div.style.fontSize = `${fontSize}px`;
    div.style.left = `${containerWidth}px`;
    div.style.top = `${position.y}px`;
    div.style.transition = `left ${finalDuration}s linear`;

    console.log(`弹幕 "${cleanTextForMeasure.substring(0, 20)}..." - 行: ${position.line}, 起始X: ${containerWidth}, 宽度: ${textWidth}, 时长: ${finalDuration.toFixed(1)}s`);

    requestAnimationFrame(() => {
      div.style.left = `-${textWidth + 50}px`;
    });
  }

  // 应用文本样式
  applyTextStyles(div, text) {
    let cleanText = text.replace(/\{[^}]*\}/g, (match) => {
      if (match.includes('\\b1')) div.style.fontWeight = 'bold';
      if (match.includes('\\i1')) div.style.fontStyle = 'italic';
      if (match.includes('\\u1')) div.style.textDecoration = 'underline';
      if (match.includes('\\s1')) div.style.textDecoration = 'line-through';

      const colorMatch = match.match(/\\c&H([0-9A-Fa-f]{6})&/);
      if (colorMatch) {
        const color = colorMatch[1];
        const r = parseInt(color.substr(4, 2), 16);
        const g = parseInt(color.substr(2, 2), 16);
        const b = parseInt(color.substr(0, 2), 16);
        div.style.color = `rgb(${r}, ${g}, ${b})`;
      }

      return '';
    });

    div.textContent = cleanText.trim();
  }

  // 清理过期字幕
  cleanupExpiredSubtitles(currentTime) {
    const subtitlesToRemove = [];
    
    this.activeSubtitles.forEach(subId => {
      const element = this.subtitleElements.get(subId);
      if (element) {
        const endTime = parseFloat(element.dataset.endTime);
        if (currentTime > endTime + 0.5) {
          if (element.parentNode) {
            element.parentNode.removeChild(element);
          }
          subtitlesToRemove.push(subId);
        }
      }
    });

    subtitlesToRemove.forEach(subId => {
      this.activeSubtitles.delete(subId);
      this.subtitleElements.delete(subId);
      this.processedSubtitles.delete(subId);
      this.activeSubtitleAreas.delete(subId);

      const area = this.activeSubtitleAreas.get(subId);
      if (area && area.line !== undefined) {
        const hasOtherActiveOnLine = Array.from(this.activeSubtitleAreas.values())
          .some(otherArea => otherArea.line === area.line && otherArea.subId !== subId);

        if (!hasOtherActiveOnLine) {
          this.lineMoveSpeeds.delete(area.line);
        }
      }
    });
  }

  // 切换字幕显示状态
  toggle() {
    const btn = document.getElementById('subtitle-toggle');
    if (btn.classList.contains('disabled') || this.subtitles.length === 0) return;

    this.subtitlesVisible = !this.subtitlesVisible;

    btn.textContent = this.subtitlesVisible ?
      window.i18n.t('subtitles.hide', '隐藏字幕') :
      window.i18n.t('subtitles.show', '显示字幕');

    if (!this.subtitlesVisible) {
      document.getElementById('subtitle-overlay').innerHTML = '';
      this.activeSubtitles.clear();
      this.subtitleElements.clear();
    }

    console.log('Subtitles toggled:', this.subtitlesVisible);
  }

  // 清理所有资源
  cleanup() {
    this.subtitles = [];
    this.activeSubtitles.clear();
    this.subtitleElements.clear();
    this.displayedSubtitles.clear();
    this.processedSubtitles.clear();
    this.activeSubtitleAreas.clear();
    this.lineMoveSpeeds.clear();
    
    const overlay = document.getElementById('subtitle-overlay');
    if (overlay) {
      overlay.innerHTML = '';
    }
  }
}

// 导出字幕管理器
window.SubtitleManager = SubtitleManager;