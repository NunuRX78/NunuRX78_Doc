/* Quest Journal — tuning data. Mọi con số cân bằng game nằm ở đây, không ghi cứng trong code. */
(function (root) {
  const CONFIG = {
    maxQuestHours: 4,               // Luật Wyatt Cheng: mỗi quest tối đa 4 giờ
    durations: [0.25, 0.5, 1, 2, 3, 4], // Các mức thời lượng cho nhanh (giờ)
    xpPerHour: 100,
    goldPerHour: 10,
    minGold: 1,
    groupBonusPct: 0.25,            // Thưởng thêm khi xong hết quest con của một quest lớn
    streakBonusPerDay: 0.05,        // +5% XP mỗi ngày streak...
    streakBonusCap: 0.5,            // ...tối đa +50%
    level: { base: 100, exponent: 1.5 }, // XP cần để lên cấp n -> n+1 = base * n^exponent
    shop: [
      { id: 'title-novice',   type: 'title', name: 'Tân Binh',            price: 0 },
      { id: 'title-slayer',   type: 'title', name: 'Kẻ Diệt Trì Hoãn',    price: 50 },
      { id: 'title-knight',   type: 'title', name: 'Hiệp Sĩ To-Do',       price: 120 },
      { id: 'title-mage',     type: 'title', name: 'Pháp Sư Tập Trung',   price: 200 },
      { id: 'title-legend',   type: 'title', name: 'Huyền Thoại Kỷ Luật', price: 500, minLevel: 10 },
      { id: 'cape-red',       type: 'cape',  name: 'Áo choàng Đỏ',        price: 0,   color: '#d94a4a' },
      { id: 'cape-blue',      type: 'cape',  name: 'Áo choàng Lam',       price: 40,  color: '#4a7ad9' },
      { id: 'cape-green',     type: 'cape',  name: 'Áo choàng Lục',       price: 60,  color: '#4fb35a' },
      { id: 'cape-purple',    type: 'cape',  name: 'Áo choàng Tím',       price: 90,  color: '#9b5ad9' },
      { id: 'cape-gold',      type: 'cape',  name: 'Áo choàng Hoàng Kim', price: 250, color: '#f2c14e', minLevel: 5 },
      { id: 'pet-none',       type: 'pet',   name: 'Không thú cưng',      price: 0,   icon: '' },
      { id: 'pet-frog',       type: 'pet',   name: 'Ếch Con',             price: 60,  icon: '🐸' },
      { id: 'pet-cat',        type: 'pet',   name: 'Mèo Mun',             price: 80,  icon: '🐈‍⬛' },
      { id: 'pet-owl',        type: 'pet',   name: 'Cú Thông Thái',       price: 150, icon: '🦉' },
      { id: 'pet-dragon',     type: 'pet',   name: 'Rồng Nhỏ',            price: 300, icon: '🐉', minLevel: 8 }
    ],
    defaults: { title: 'title-novice', cape: 'cape-red', pet: 'pet-none' }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = CONFIG;
  else root.QJ_CONFIG = CONFIG;
})(this);
