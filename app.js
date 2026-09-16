// ============ 常量 ============
const STORAGE_KEY = 'menu_selected_dishes';
const MENU_DATA_URL = 'menu-data.json';

// ============ 核心状态 ============
const selectedDishes = new Set(); // 存储已选菜品名称
const selectedListEl = document.getElementById('selectedList');
const selectedCountEl = document.getElementById('selectedCount');
const menuContainer = document.querySelector('.menu-container');

// ============ 状态持久化（localStorage） ============
function saveSelection() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...selectedDishes]));
  } catch (e) {
    console.warn('无法保存选择状态:', e);
  }
}

function loadSelection() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const arr = JSON.parse(saved);
      if (Array.isArray(arr)) {
        arr.forEach(name => selectedDishes.add(name));
      }
    }
  } catch (e) {
    console.warn('无法读取选择状态:', e);
  }
}

// ============ 动态渲染菜单（数据驱动） ============
function renderMenu(data) {
  // 找到页脚元素，菜品分类将插入在页脚之前
  const footer = menuContainer.querySelector('.footer');

  // 用于合并同一 category 下的不同 subcategory 分组
  const categoryMap = new Map();

  data.forEach(item => {
    const fullTitle = item.icon + ' ' + item.category;
    if (!categoryMap.has(fullTitle)) {
      categoryMap.set(fullTitle, []);
    }
    categoryMap.get(fullTitle).push(item);
  });

  categoryMap.forEach((items, fullTitle) => {
    const section = document.createElement('section');
    section.className = 'category';

    const title = document.createElement('h2');
    title.className = 'category-title';
    title.textContent = fullTitle;
    section.appendChild(title);

    items.forEach(item => {
      // 如果有子分类，添加子分类标题
      if (item.subcategory) {
        const subTitle = document.createElement('h3');
        subTitle.className = 'subcategory-title';
        subTitle.textContent = item.subcategory;
        section.appendChild(subTitle);
      }

      const grid = document.createElement('div');
      grid.className = 'dishes-grid';

      item.dishes.forEach(dish => {
        const card = document.createElement('div');
        card.className = 'dish-card';
        card.setAttribute('data-name', dish.name);

        const nameDiv = document.createElement('div');
        nameDiv.className = 'dish-name';
        nameDiv.textContent = dish.name;
        card.appendChild(nameDiv);

        const descDiv = document.createElement('div');
        descDiv.className = 'dish-desc';
        descDiv.textContent = dish.desc;
        card.appendChild(descDiv);

        grid.appendChild(card);
      });

      section.appendChild(grid);
    });

    menuContainer.insertBefore(section, footer);
  });
}

// ============ 加载菜品数据 ============
async function loadMenuData() {
  try {
    const response = await fetch(MENU_DATA_URL);
    if (!response.ok) {
      throw new Error('HTTP ' + response.status);
    }
    const data = await response.json();
    renderMenu(data);
  } catch (e) {
    console.error('加载菜品数据失败:', e);
    // 降级提示
    const footer = menuContainer.querySelector('.footer');
    const errorMsg = document.createElement('p');
    errorMsg.style.cssText = 'text-align:center;padding:40px;color:#c62828;font-size:1.1rem;';
    errorMsg.textContent = '菜品数据加载失败，请刷新页面重试';
    menuContainer.insertBefore(errorMsg, footer);
  }
}

// ============ 渲染已选菜品列表（使用 DOM 构建，避免 XSS 风险） ============
function renderSelectedList() {
  // 清空列表
  while (selectedListEl.firstChild) {
    selectedListEl.removeChild(selectedListEl.firstChild);
  }

  if (selectedDishes.size === 0) {
    const emptySpan = document.createElement('span');
    emptySpan.className = 'selected-empty';
    emptySpan.textContent = '暂未选择菜品';
    selectedListEl.appendChild(emptySpan);
    selectedCountEl.textContent = '0';
    return;
  }

  selectedCountEl.textContent = selectedDishes.size;

  selectedDishes.forEach(dishName => {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'selected-item';

    const nameSpan = document.createElement('span');
    nameSpan.textContent = dishName;
    itemDiv.appendChild(nameSpan);

    const closeSpan = document.createElement('span');
    closeSpan.className = 'selected-item-close';
    closeSpan.textContent = '\u00d7';
    closeSpan.addEventListener('click', function() {
      removeDish(dishName);
    });
    itemDiv.appendChild(closeSpan);

    selectedListEl.appendChild(itemDiv);
  });
}

// ============ 添加/移除菜品 ============
function toggleDish(dishName) {
  if (selectedDishes.has(dishName)) {
    selectedDishes.delete(dishName);
  } else {
    selectedDishes.add(dishName);
  }
  renderSelectedList();
  saveSelection();
}

// ============ 移除单个菜品 ============
function removeDish(dishName) {
  selectedDishes.delete(dishName);
  renderSelectedList();
  saveSelection();

  // 更新菜品卡片样式
  document.querySelectorAll('.dish-card[data-name="' + dishName + '"]').forEach(card => {
    card.classList.remove('selected');
  });
}

// ============ 清空所有选择 ============
function clearSelection() {
  selectedDishes.clear();
  renderSelectedList();
  saveSelection();
  document.querySelectorAll('.dish-card').forEach(card => {
    card.classList.remove('selected');
  });
}

// ============ 生成订单文本 ============
function generateOrderText() {
  if (selectedDishes.size === 0) {
    return '\n暂未选择任何菜品\n';
  }

  let orderText = '已选菜品（共' + selectedDishes.size + '道）：\n';
  orderText += '──────────────\n';

  let index = 1;
  selectedDishes.forEach(dishName => {
    orderText += index + '. ' + dishName + '\n';
    index++;
  });

  orderText += '──────────────\n';

  return orderText;
}

// ============ 点餐分享功能 ============
function shareSelection() {
  if (selectedDishes.size === 0) {
    alert('\u26a0\ufe0f 请先选择菜品');
    return;
  }

  const orderText = generateOrderText();

  // 复制到剪贴板
  navigator.clipboard.writeText(orderText).then(() => {
    alert('\u2705 点餐信息已复制！\n\n' + orderText + '\n请粘贴到聊天窗口，发送给雷师傅');
  }).catch(err => {
    // 降级方案：使用 prompt
    prompt('点餐信息（请全选并复制）：', orderText);
  });
}

// ============ 绑定菜品卡片点击事件 ============
function bindCardEvents() {
  document.querySelectorAll('.dish-card').forEach(card => {
    const dishName = card.getAttribute('data-name');

    card.addEventListener('click', function() {
      // 切换选中状态
      this.classList.toggle('selected');
      toggleDish(dishName);
    });
  });
}

// ============ 恢复已选菜品的卡片视觉状态 ============
function restoreSelectedCards() {
  selectedDishes.forEach(dishName => {
    document.querySelectorAll('.dish-card[data-name="' + dishName + '"]').forEach(card => {
      card.classList.add('selected');
    });
  });
}

// ============ Service Worker 注册（PWA 离线支持） ============
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('./sw.js').catch(err => {
        console.warn('Service Worker 注册失败:', err);
      });
    });
  }
}

// ============ 初始化 ============
async function init() {
  // 1. 加载持久化状态
  loadSelection();

  // 2. 加载菜品数据并动态渲染
  await loadMenuData();

  // 3. 绑定卡片点击事件
  bindCardEvents();

  // 4. 恢复已选菜品的卡片视觉状态
  restoreSelectedCards();

  // 5. 渲染已选列表
  renderSelectedList();

  // 6. 注册 Service Worker
  registerServiceWorker();
}

// DOM 就绪后启动
init();
