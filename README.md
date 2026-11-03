# Говори Київської Русі — інтерактивний атлас

[Відкрити атлас](https://yborunov.github.io/kyivan-rus-dialects/)

Україномовний освітній атлас східнослов’янських говорів приблизно 1050–1250 років. Оберіть кольорову зону на карті або в легенді, щоб переглянути мовні риси, приклади й джерела. Вимкніть діалектні зони, щоб роздивитися сучасні кордони.

Кольорові зони — схематичне узагальнення мовних даних за різні століття. Вони не відтворюють політичних кордонів Київської Русі чи точних меж говорів.

Сучасні контури: [Natural Earth, Admin 0 Countries, Ukraine point of view](https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-0-countries/), [вихідний GeoJSON](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_10m_admin_0_countries_ukr.geojson). Геометрію спрощено й обрізано до меж карти. Крим показано в межах України.

GitHub Pages публікує `index.html` з кореня гілки `main`. Сторінка не потребує зовнішніх бібліотек чи збірки.

## Кордони в часі

[Відкрити політичну карту](https://yborunov.github.io/kyivan-rus-dialects/history.html). Повзунок охоплює 882–2026 роки. За 882–2023 роки відображаються записи, чиї інтервали `FromYear`–`ToYear` включають обраний рік. Від 2024 року використано сучасний шар міжнародно визнаних кордонів. Повторення контуру в кількох роках відображає роздільність джерела; проміжні межі не домальовано. Назви політичних утворень подано українською.

Історичний шар адаптовано з [Cliopatria v0.2.1, Seshat Global History Databank](https://github.com/Seshat-Global-History-Databank/cliopatria/tree/v0.2.1) ([CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), [опис набору даних](https://doi.org/10.1038/s41597-025-04516-9)). Залишено записи політичних утворень без агрегатів, що дублюють складові. Геометрію обрізано до рамки 15–46° сх. д., 41–60° пн. ш., спрощено й перетворено на SVG. Берегова лінія та контур сучасної України — Natural Earth.

Для відтворення `history-data.js` завантажте `cliopatria.geojson.zip` із зазначеного випуску та GeoJSON Natural Earth за посиланням вище, встановіть Shapely 2.1+ і запустіть:

```sh
python scripts/build-history.py cliopatria.geojson.zip ne_10m_admin_0_countries_ukr.geojson
```
