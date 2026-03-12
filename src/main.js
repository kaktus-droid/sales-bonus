const sellerStats = data.sellers.map((seller) => ({
    id: seller.id,
    name: `${seller.first_name} ${seller.last_name}`,
    revenue: 0,
    profit: 0,
    sales_count: 0,
    bonus: 0,
    products_sold: {},
  }));
  //console.log(sellerStats)

  const sellerIndex = sellerStats.reduce((index, seller) => {
    index[seller.id] = seller;
    return index;
  }, {}); // Ключом будет id, значением — запись из sellerStats
  //console.log(sellerIndex)

  const productIndex = data.products.reduce((index, product) => {
    index[product.sku] = product;
    return index;
  }, {}); // Ключом будет sku, значением — запись из data.products
  //console.log(productIndex)
   
  
  /**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
  // @TODO: Расчет выручки от операции
  if (
    purchase === undefined ||
    _product === undefined // _product — это продукт из коллекции data.products
  ) {
    throw new Error("Переменная не определена");
  }
  const { discount, sale_price, quantity } = purchase; // purchase — это одна из записей в поле items из чека в data.purchase_records
  const revenue = sale_price * quantity * (1 - discount / 100);

  return revenue;
}

data.purchase_records.forEach((record) => { // Здесь посчитаем промежуточные данные и отсортируем продавцов
    // Чек
    const seller = sellerIndex[record.seller_id]; // Продавец
    seller.sales_count += 1; // Увеличить количество продаж
    seller.revenue += record.total_amount; // Увеличить общую сумму выручки всех продаж

    // Расчёт прибыли для каждого товара
    record.items.forEach((item) => { 
      const product = productIndex[item.sku]; // Товар
      let cost = product.purchase_price * item.quantity; // Посчитать себестоимость (cost) товара как product.purchase_price, умноженную на количество товаров из чека
      let revenue = calculateSimpleRevenue(item, product); // Посчитать выручку (revenue) с учётом скидки через функцию calculateRevenue
      let profit = revenue - cost; // Посчитать прибыль: выручка минус себестоимость
      seller.profit += profit; // Увеличить общую накопленную прибыль (profit) у продавца

      // Учёт количества проданных товаров
      if (!seller.products_sold[item.sku]) {
        seller.products_sold[item.sku] = 0;
      }
      seller.products_sold[item.sku] += item.quantity; // По артикулу товара увеличить его проданное количество у продавца
    });
  });

  let sortedSellers = sellerStats.sort((a, b) => {
    if (a.profit > b.profit) {
      return -1;
    }
    if (a.profit < b.profit) {
      return 1;
    }
    return 0;
  });

  //console.log(sortedSellers)

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */

function calculateBonusByProfit(index, total, seller) {
  if (index === undefined || total === undefined || seller === undefined) {
    throw new Error("Переменная не определена");
  }
  const { profit } = seller; // @TODO: Расчет бонуса от позиции в рейтинге
  let bonus = 0;
  if (index === 0) {
    bonus = 0.15 * seller.profit;
    return bonus;
  } else if (index === 1 || index === 2) {
    bonus = 0.1 * seller.profit;
    return bonus;
  } else if (index === total - 1) {
    bonus = 0;
    return bonus;
  } else {
    bonus = 0.05 * seller.profit;
    return bonus;
  }
}

sellerStats.forEach((seller, index) => { // Вызовем функцию расчёта бонуса для каждого продавца в отсортированном массиве
    seller.bonus = calculateBonusByProfit(index, sellerStats.length, seller); 
    seller.top_products = Object.entries(seller.products_sold) // Формируем топ-10 товаров
      .map(([sku, quantity]) => {
        const product = productIndex[sku]; // Берём инфо из каталога
        return {
          sku: sku,
          quantity: quantity,
        };
      })
      .sort((a, b) => {
        if (a.quantity > b.quantity) {
          return -1;
        }
        if (a.quantity < b.quantity) {
          return 1;
        }
        return 0;
      })
      .slice(0, 10);
  });

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */

function analyzeSalesData(data, options) {
  // Здесь проверим входящие данные
  if (
    !data ||
    !Array.isArray(data.sellers) ||
    data.sellers.length === 0 ||
    !Array.isArray(data.customers) ||
    data.customers.length === 0 ||
    !Array.isArray(data.products) ||
    data.products.length === 0 ||
    !Array.isArray(data.purchase_records) ||
    data.purchase_records.length === 0
  ) {
    throw new Error("Некорректные входные данные");
  }

  if (!options || typeof options !== "object" || Array.isArray(options)) {
    throw new Error("Опции должны быть объектом");
  }

  const { calculateRevenue, calculateBonus } = options; // Сюда передадим функции для расчётов

  if (calculateRevenue === undefined || calculateBonus === undefined) {
    throw new Error("Переменная не определена");
  }

  if (
    typeof calculateRevenue !== "function" ||
    typeof calculateBonus !== "function"
  ) {
    throw new Error("Переменная не функция");
  }
  // Сформируем и вернём отчёт
  return sellerStats.map((seller) => ({
    seller_id: seller.id, // Строка, идентификатор продавца
    name: seller.name, // Строка, имя продавца
    revenue: +seller.revenue.toFixed(2), // Число с двумя знаками после точки, выручка продавца
    profit: +seller.profit.toFixed(2), // Число с двумя знаками после точки, прибыль продавца
    sales_count: seller.sales_count, // Целое число, количество продаж продавца
    top_products: seller.top_products, // Массив объектов вида: { "sku": "SKU_008","quantity": 10}, топ-10 товаров продавца
    bonus: +seller.bonus.toFixed(2), // Число с двумя знаками после точки, бонус продавца
  }));
}

const options = {
  // Функция расчёта выручки (используем calculateSimpleRevenue)
  calculateRevenue: calculateSimpleRevenue,

  // Функция расчёта бонуса (используем calculateBonusByProfit)
  calculateBonus: calculateBonusByProfit,
};

const mainReport = analyzeSalesData(data, options);



//function analyzeSalesData(data, options) {
// @TODO: Проверка входных данных

// @TODO: Проверка наличия опций

// @TODO: Подготовка промежуточных данных для сбора статистики

// @TODO: Индексация продавцов и товаров для быстрого доступа

// @TODO: Расчет выручки и прибыли для каждого продавца

// @TODO: Сортировка продавцов по прибыли

// @TODO: Назначение премий на основе ранжирования

// @TODO: Подготовка итоговой коллекции с нужными полями
//}
