// 写真を追加・並べ替えするときは、この配列だけ編集してください。
const featuredDishes = [
  { image: "assets/featured/gyoza-don.webp", name: "餃子丼" },
  { image: "assets/featured/tempura.webp", name: "天ぷら盛り合わせ" },
  { image: "assets/featured/sui-gyoza.webp", name: "水餃子" },
  { image: "assets/featured/tonpeiyaki.webp", name: "とん平焼き" },
  { image: "assets/featured/salad.webp", name: "サラダ" },
  { image: "assets/featured/grilled-meat.webp", name: "焼き肉料理" },
  { image: "assets/featured/sashimi.webp", name: "お刺身盛り合わせ" },
];

const grid = document.getElementById('tennoya-featured-grid');
if (grid) {
  const fragment = document.createDocumentFragment();
  for (const dish of featuredDishes) {
    const figure = document.createElement('figure');
    const img = document.createElement('img');
    img.src = dish.image;
    img.alt = dish.name;
    img.loading = 'lazy';
    img.decoding = 'async';
    const caption = document.createElement('figcaption');
    caption.textContent = dish.name;
    figure.append(img, caption);
    fragment.append(figure);
  }
  grid.append(fragment);
}
