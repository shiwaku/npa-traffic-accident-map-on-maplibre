// addProtocolの設定
let protocol = new pmtiles.Protocol();
maplibregl.addProtocol("pmtiles", protocol.tile);

// マップの初期化
const map = new maplibregl.Map({
  container: "map",
  style: "./std.json",
  // style: 'https://tile2.openstreetmap.jp/styles/osm-bright-ja/style.json',
  // style: "https://tile.openstreetmap.jp/styles/maptiler-basic-ja/style.json",
  zoom: 15,
  maxZoom: 23,
  minZoom: 4,
  center: [139.487748, 35.922752],
  hash: true,
  attributionControl: false,
});

// ズーム・回転
map.addControl(new maplibregl.NavigationControl());

// フルスクリーンモードのオンオフ
map.addControl(new maplibregl.FullscreenControl());

// 現在位置表示
map.addControl(
  new maplibregl.GeolocateControl({
    positionOptions: {
      enableHighAccuracy: false,
    },
    fitBoundsOptions: { maxZoom: 18 },
    trackUserLocation: true,
    showUserLocation: true,
  })
);

// スケール表示
map.addControl(
  new maplibregl.ScaleControl({
    maxWidth: 200,
    unit: "metric",
  })
);

// Attributionを折りたたみ表示
map.addControl(
  new maplibregl.AttributionControl({
    compact: true,
    customAttribution:
      '<a href="https://github.com/shiwaku/npa-traffic-accident-map-on-maplibre" target="_blank">GitHub</a>',
  })
);

//ジオコーダー（国土地理院 地名検索API）
var geocoder_api = {
  forwardGeocode: async (config) => {
    const features = [];
    const Text_Prefix = config.query.substr(0, 3);
    try {
      let request =
        "https://msearch.gsi.go.jp/address-search/AddressSearch?q=" +
        config.query;
      const response = await fetch(request);
      const geojson = await response.json();

      for (var i = 0; i < geojson.length; i++) {
        if (geojson[i].properties.title.indexOf(Text_Prefix) !== -1) {
          let point = {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: geojson[i].geometry.coordinates,
            },
            place_name: geojson[i].properties.title,
            properties: geojson[i].properties,
            text: geojson[i].properties.title,
            place_type: ["place"],
            center: geojson[i].geometry.coordinates,
          };
          features.push(point);
        }
      }
    } catch (e) {
      console.error(`Failed to forwardGeocode with error: ${e}`);
    }
    return {
      features: features,
    };
  },
};
map.addControl(
  new MaplibreGeocoder(geocoder_api, { maplibregl: maplibregl }),
  "top-left"
);

// TerraDraw
const draw = new MaplibreTerradrawControl.MaplibreTerradrawControl({
  modes: [
    "render",
    "point",
    "linestring",
    "polygon",
    "rectangle",
    "circle",
    "freehand",
    "angled-rectangle",
    "sensor",
    "sector",
    "select",
    "delete-selection",
    "delete",
    "download",
  ],
  open: false,
});
map.addControl(draw, "top-right");

// マップをロード
map.on("load", () => {
  // 全国最新写真（シームレス）ソース
  map.addSource("seamlessphoto", {
    type: "raster",
    tiles: [
      "https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg",
    ],
    tileSize: 256,
    attribution:
      '<a href="https://maps.gsi.go.jp/development/ichiran.html#seamlessphoto">全国最新写真（シームレス）</a>',
  });

  // 全国最新写真（シームレス）レイヤ
  map.addLayer({
    id: "seamlessphoto",
    type: "raster",
    source: "seamlessphoto",
    minzoom: 14,
    maxzoom: 23,
  });

  // スライダーで空中写真レイヤの不透明度を制御
  const sliderOpactiy = document.getElementById("slider-opacity");
  const sliderOpactiyValue = document.getElementById("slider-opacity-value");

  // 不透明度の初期表示
  map.setPaintProperty("seamlessphoto", "raster-opacity", 0.5);

  sliderOpactiy.addEventListener("input", (e) => {
    map.setPaintProperty(
      "seamlessphoto",
      "raster-opacity",
      parseInt(e.target.value, 10) / 100
    );
    sliderOpactiyValue.textContent = e.target.value + "%";
  });

  // ゾーン30ソース
  map.addSource("pmtiles-kisei", {
    type: "vector",
    // url: "pmtiles://https://shi-works.com/pmtiles/traffic-accident/202303011801_typeD_kisei_99_47_polygon.pmtiles",
    url: "pmtiles://https://shi-works.com/pmtiles/traffic-accident/jartic_kisei_202507_polygons_code114.pmtiles",
    attribution:
      '<a href="https://www.jartic.or.jp/">日本道路交通情報センター(JARTIC)オープンデータ「交通規制情報」を加工して作成</a>',
  });

  // ゾーン30ポリゴンレイヤ
  map.addLayer({
    id: "kisei-fill",
    type: "fill",
    source: "pmtiles-kisei",
    "source-layer": "jartic_kisei_202507_polygons_code114",
    minzoom: 12,
    maxzoom: 23,
    layout: {},
    paint: {
      "fill-color": "rgba(45, 186, 118, 1)",
      "fill-opacity": 0.2,
    },
  });

  // ゾーン30ラインレイヤ
  map.addLayer({
    id: "kisei-line",
    type: "line",
    source: "pmtiles-kisei",
    "source-layer": "jartic_kisei_202507_polygons_code114",
    minzoom: 12,
    maxzoom: 23,
    layout: {
      "line-join": "round",
      "line-cap": "round",
    },
    paint: {
      "line-color": "rgba(45, 186, 118, 1)",
      "line-opacity": 1,
    },
  });

  // 交通事故データ
  map.addSource("pmtiles-jiko", {
    type: "vector",
    // url: "pmtiles://https://shi-works.com/pmtiles/traffic-accident/honhyo_2019-2023_convert.pmtiles",
    url: "pmtiles://https://shi-works.com/pmtiles/traffic-accident/honhyo_2019-2024_convert.pmtiles",
    attribution:
      '<a href="https://www.npa.go.jp/publications/statistics/koutsuu/opendata/index_opendata.html">警察庁 交通事故統計情報のオープンデータ（2019～2024年）（警察庁Webサイト）を加工して作成</a>',
  });

  // 負傷事故ポイントレイヤ
  map.addLayer({
    id: "fushoujiko-1",
    source: "pmtiles-jiko",
    "source-layer": "honhyo_20192024_convert",
    type: "circle",
    paint: {
      "circle-color": "#FFFFFF",
      "circle-radius": 8,
    },
  });

  // 負傷事故ポイントレイヤ
  map.addLayer({
    id: "fushoujiko-2",
    source: "pmtiles-jiko",
    "source-layer": "honhyo_20192024_convert",
    type: "circle",
    paint: {
      "circle-color": "#003FFF",
      "circle-radius": 6,
    },
  });

  // 負傷事故ラベルレイヤ
  map.addLayer({
    id: "fushoujiko-label",
    type: "symbol",
    source: "pmtiles-jiko",
    "source-layer": "honhyo_20192024_convert",
    minzoom: 16,
    maxzoom: 23,
    layout: {
      "text-field": [
        "concat",
        ["get", "発生日時_年"],
        "/",
        ["get", "発生日時_月"],
        "/",
        ["get", "発生日時_日"],
      ],
      "text-font": ["NotoSansJP-Regular"],
      "text-offset": [0, -1.2],
      "text-allow-overlap": true,
      "text-size": 12,
    },
    paint: {
      "text-color": "rgba(0, 0, 255, 1)",
      "text-halo-color": "rgba(255, 255, 255, 1)",
      "text-halo-width": 1,
    },
  });

  // 負傷事故レイヤのフィルタ設定
  map.setFilter("fushoujiko-1", ["==", "事故内容", "負傷事故"]);
  map.setFilter("fushoujiko-2", ["==", "事故内容", "負傷事故"]);
  map.setFilter("fushoujiko-label", ["==", "事故内容", "負傷事故"]);

  // 死亡事故ポイントレイヤ
  map.addLayer({
    id: "shiboujiko-1",
    source: "pmtiles-jiko",
    "source-layer": "honhyo_20192024_convert",
    type: "circle",
    paint: {
      "circle-color": "#FFFFFF",
      "circle-radius": 8,
    },
  });

  // 死亡事故ポイントレイヤ
  map.addLayer({
    id: "shiboujiko-2",
    source: "pmtiles-jiko",
    "source-layer": "honhyo_20192024_convert",
    type: "circle",
    paint: {
      "circle-color": "#FF003F",
      "circle-radius": 6,
    },
  });

  // 死亡事故ラベルレイヤ
  map.addLayer({
    id: "shiboujiko-label",
    type: "symbol",
    source: "pmtiles-jiko",
    "source-layer": "honhyo_20192024_convert",
    minzoom: 16,
    maxzoom: 23,
    layout: {
      "text-field": [
        "concat",
        ["get", "発生日時_年"],
        "/",
        ["get", "発生日時_月"],
        "/",
        ["get", "発生日時_日"],
      ],
      "text-font": ["NotoSansJP-Regular"],
      "text-offset": [0, -1.2],
      "text-allow-overlap": true,
      "text-size": 12,
    },
    paint: {
      "text-color": "rgba(255, 0, 0, 1)",
      "text-halo-color": "rgba(255, 255, 255, 1)",
      "text-halo-width": 1,
    },
  });

  // 死亡事故レイヤのフィルタ設定
  map.setFilter("shiboujiko-1", ["==", "事故内容", "死亡事故"]);
  map.setFilter("shiboujiko-2", ["==", "事故内容", "死亡事故"]);
  map.setFilter("shiboujiko-label", ["==", "事故内容", "死亡事故"]);

  // 小学校ソース
  map.addSource("pmtiles-school", {
    type: "vector",
    url: "pmtiles://https://shi-works.com/pmtiles/traffic-accident/P29-21_primary_school.pmtiles",
    attribution:
      '<a href="https://nlftp.mlit.go.jp/">国土数値情報 学校データを加工して作成</a>',
  });

  // 小学校ポイントレイヤ
  map.addLayer({
    id: "school-1",
    source: "pmtiles-school",
    "source-layer": "P2921_primary_school",
    type: "circle",
    minzoom: 13,
    maxzoom: 23,
    paint: {
      "circle-color": "#FFFFFF",
      "circle-radius": 8,
    },
  });

  // 小学校ポイントレイヤ
  map.addLayer({
    id: "school-2",
    source: "pmtiles-school",
    "source-layer": "P2921_primary_school",
    type: "circle",
    minzoom: 13,
    maxzoom: 23,
    paint: {
      "circle-color": "#009800",
      "circle-radius": 6,
    },
  });

  // 小学校ラベルレイヤ
  map.addLayer({
    id: "school-label",
    type: "symbol",
    source: "pmtiles-school",
    "source-layer": "P2921_primary_school",
    minzoom: 13,
    maxzoom: 23,
    layout: {
      "text-field": ["get", "P29_004"],
      "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
      "text-size": 12,
      "text-offset": [0, -1.2],
    },
    paint: {
      "text-color": "rgba(0,　152,　0, 1)",
      "text-halo-blur": 1,
      "text-halo-color": "rgba(255, 255, 255, 1)",
      "text-halo-width": 1.5,
    },
  });

  map.showTileBoundaries = false;

  /*
          // マウスポインタの座標（フルスクリーンモードで消えるバグあり、スマホで表示されない）
          map.on('mousemove', (e) => {
              document.getElementById('info').innerHTML = JSON.stringify('緯度=' + e.lngLat.lat.toFixed(5) + ', 経度=' + e.lngLat.lng.toFixed(5));
          });
          */
});

// 死亡事故ポップアップ表示
map.on("click", "shiboujiko-1", (e) => {
  // var lng = e.lngLat.lng;
  // var lat = e.lngLat.lat;
  var lng = e.features[0].geometry.coordinates[0];
  var lat = e.features[0].geometry.coordinates[1];

  var jikonaiyo = e.features[0].properties["事故内容"];
  var shishasu = parseInt(e.features[0].properties["死者数"]);
  var fushoshasu = parseInt(e.features[0].properties["負傷者数"]);
  var rosemmei = e.features[0].properties["路線名"];
  var jogesen = e.features[0].properties["上下線"];
  var hasseinichiji =
    e.features[0].properties["発生日時_年"] +
    "年" +
    e.features[0].properties["発生日時_月"] +
    "月" +
    e.features[0].properties["発生日時_日"] +
    "日" +
    e.features[0].properties["発生日時_時"] +
    "時" +
    e.features[0].properties["発生日時_分"] +
    "分";
  var tenko = e.features[0].properties["天候"];
  var chikei = e.features[0].properties["地形"];
  var romenjotai = e.features[0].properties["路面状態"];
  var dorokeijo = e.features[0].properties["道路形状"];
  var shingoki = e.features[0].properties["信号機"];
  var shadofukuin = e.features[0].properties["車道幅員"];
  var dorosenkei = e.features[0].properties["道路線形"];
  var shototsuchiten = e.features[0].properties["衝突地点"];
  var zonkisei = e.features[0].properties["ゾーン規制"];
  var chuobunritaishisetsuto = e.features[0].properties["中央分離帯施設等"];
  var hoshadokubun = e.features[0].properties["歩車道区分"];
  var jikoruikei = e.features[0].properties["事故類型"];

  var nenrei_a = e.features[0].properties["年齢（当事者A）"];
  var nenrei_b = e.features[0].properties["年齢（当事者B）"];
  var tojishashubetsu_a = e.features[0].properties["当事者種別（当事者A）"];
  var tojishashubetsu_b = e.features[0].properties["当事者種別（当事者B）"];
  var yotobetsu_a = e.features[0].properties["用途別（当事者A）"];
  var yotobetsu_b = e.features[0].properties["用途別（当事者B）"];
  var sharyokeijo_a = e.features[0].properties["車両形状（当事者A）"];
  var sharyokeijo_b = e.features[0].properties["車両形状（当事者B）"];
  var sokudokisei_a =
    e.features[0].properties["速度規制（指定のみ）（当事者A）"];
  var sokudokisei_b =
    e.features[0].properties["速度規制（指定のみ）（当事者B）"];
  var ichijiteishikisei_hyoshiki_a =
    e.features[0].properties["一時停止規制_標識（当事者A）"];
  var ichijiteishikisei_hyoji_a =
    e.features[0].properties["一時停止規制_表示（当事者A）"];
  var ichijiteishikisei_hyoshiki_b =
    e.features[0].properties["一時停止規制_標識（当事者B）"];
  var ichijiteishikisei_hyoji_b =
    e.features[0].properties["一時停止規制_表示（当事者B）"];
  var sharyonoshototsubui_a =
    e.features[0].properties["車両の衝突部位（当事者A）"];
  var sharyonoshototsubui_b =
    e.features[0].properties["車両の衝突部位（当事者B）"];
  var sharyonosonkaiteido_a =
    e.features[0].properties["車両の損壊程度（当事者A）"];
  var sharyonosonkaiteido_b =
    e.features[0].properties["車両の損壊程度（当事者B）"];
  var eabaggunosobi_a = e.features[0].properties["エアバッグの装備（当事者A）"];
  var eabaggunosobi_b = e.features[0].properties["エアバッグの装備（当事者B）"];
  var saidoeabaggunosobi_a =
    e.features[0].properties["サイドエアバッグの装備（当事者A）"];
  var saidoeabaggunosobi_b =
    e.features[0].properties["サイドエアバッグの装備（当事者B）"];
  var jinshinsonshoteido_a =
    e.features[0].properties["人身損傷程度（当事者A）"];
  var jinshinsonshoteido_b =
    e.features[0].properties["人身損傷程度（当事者B）"];

  new maplibregl.Popup()
    .setLngLat(e.lngLat)
    .setHTML(
      // 事故内容
      "<b>" +
        "<big>" +
        '<font color="red">' +
        "事故内容: " +
        jikonaiyo +
        "</font>" +
        "</big>" +
        "</b>" +
        "<br>" +
        "発生日時: " +
        hasseinichiji +
        "<br>" +
        "路線名: " +
        rosemmei +
        "<br>" +
        "上下線: " +
        jogesen +
        "<br>" +
        "死者数: " +
        shishasu +
        "<br>" +
        "負傷者数: " +
        fushoshasu +
        "<br>" +
        "天候: " +
        tenko +
        "<br>" +
        "地形: " +
        chikei +
        "<br>" +
        "路面状態: " +
        romenjotai +
        "<br>" +
        "道路形状: " +
        dorokeijo +
        "<br>" +
        "信号機: " +
        shingoki +
        "<br>" +
        "車道幅員: " +
        shadofukuin +
        "<br>" +
        "道路線形: " +
        dorosenkei +
        "<br>" +
        "衝突地点: " +
        shototsuchiten +
        "<br>" +
        "ゾーン規制: " +
        zonkisei +
        "<br>" +
        "中央分離帯施設等: " +
        chuobunritaishisetsuto +
        "<br>" +
        "歩車道区分: " +
        hoshadokubun +
        "<br>" +
        "事故類型: " +
        jikoruikei +
        "<br>" +
        // 表形式
        "<table>" +
        "<tr>" +
        '<th width="140">' +
        "項目" +
        "</th> " +
        '<th width="100">' +
        "当事者A" +
        "</th> " +
        '<th width="100">' +
        "当事者B" +
        "</th>" +
        "</tr>" +
        "<tr>" +
        "<td>" +
        "年齢層" +
        "</td> " +
        "<td>" +
        nenrei_a +
        "</td> " +
        "<td>" +
        nenrei_b +
        "</td>" +
        "</tr>" +
        "<tr>" +
        "<td>" +
        "当事者種別" +
        "</td> " +
        "<td>" +
        tojishashubetsu_a +
        "</td> " +
        "<td>" +
        tojishashubetsu_b +
        "</td>" +
        "</tr>" +
        "<tr>" +
        "<td>" +
        "車両の衝突部位" +
        "</td> " +
        "<td>" +
        sharyonoshototsubui_a +
        "</td> " +
        "<td>" +
        sharyonoshototsubui_b +
        "</td>" +
        "</tr>" +
        "<tr>" +
        "<td>" +
        "車両の損壊程度" +
        "</td> " +
        "<td>" +
        sharyonosonkaiteido_a +
        "</td> " +
        "<td>" +
        sharyonosonkaiteido_b +
        "</td>" +
        "</tr>" +
        "<tr>" +
        "<td>" +
        "人身損傷程度" +
        "</td> " +
        "<td>" +
        jinshinsonshoteido_a +
        "</td> " +
        "<td>" +
        jinshinsonshoteido_b +
        "</td>" +
        "</tr>" +
        "<tr>" +
        "<td>" +
        "用途別" +
        "</td> " +
        "<td>" +
        yotobetsu_a +
        "</td> " +
        "<td>" +
        yotobetsu_b +
        "</td>" +
        "</tr>" +
        "<tr>" +
        "<td>" +
        "車両形状" +
        "</td> " +
        "<td>" +
        sharyokeijo_a +
        "</td> " +
        "<td>" +
        sharyokeijo_b +
        "</td>" +
        "</tr>" +
        "<tr>" +
        "<td>" +
        "速度規制（指定のみ）" +
        "</td> " +
        "<td>" +
        sokudokisei_a +
        "</td> " +
        "<td>" +
        sokudokisei_b +
        "</td>" +
        "</tr>" +
        "<tr>" +
        "<td>" +
        "一時停止規制_標識" +
        "</td> " +
        "<td>" +
        ichijiteishikisei_hyoshiki_a +
        "</td> " +
        "<td>" +
        ichijiteishikisei_hyoshiki_b +
        "</td>" +
        "</tr>" +
        "<tr>" +
        "<td>" +
        "一時停止規制_表示" +
        "</td> " +
        "<td>" +
        ichijiteishikisei_hyoji_a +
        "</td> " +
        "<td>" +
        ichijiteishikisei_hyoji_b +
        "</td>" +
        "</tr>" +
        "<tr>" +
        "<td>" +
        "ｴｱﾊﾞｯｸﾞの装備" +
        "</td> " +
        "<td>" +
        eabaggunosobi_a +
        "</td> " +
        "<td>" +
        eabaggunosobi_b +
        "</td>" +
        "</tr>" +
        "<tr>" +
        "<td>" +
        "ｻｲﾄﾞｴｱﾊﾞｯｸﾞの装備" +
        "</td> " +
        "<td>" +
        saidoeabaggunosobi_a +
        "</td> " +
        "<td>" +
        saidoeabaggunosobi_b +
        "</td>" +
        "</tr>" +
        "<table>" +
        "座標: " +
        lat.toFixed(7) +
        "," +
        lng.toFixed(7) +
        " ※事故発生位置の座標<br>" +
        "<a href=https://www.google.com/maps?q=" +
        lat +
        "," +
        lng +
        "&hl=ja' target='_blank'>🌎Google Maps</a>" +
        " " +
        "<a href=https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=" +
        lat +
        "," +
        lng +
        "&hl=ja' target='_blank'>📷Street View</a>"
    )
    .addTo(map);
});

// 負傷事故ポップアップ表示
map.on("click", "fushoujiko-1", (e) => {
  // lng = e.lngLat.lng;
  // lat = e.lngLat.lat;
  var lng = e.features[0].geometry.coordinates[0];
  var lat = e.features[0].geometry.coordinates[1];

  var jikonaiyo = e.features[0].properties["事故内容"];
  var shishasu = parseInt(e.features[0].properties["死者数"]);
  var fushoshasu = parseInt(e.features[0].properties["負傷者数"]);
  var rosemmei = e.features[0].properties["路線名"];
  var jogesen = e.features[0].properties["上下線"];
  var hasseinichiji =
    e.features[0].properties["発生日時_年"] +
    "年" +
    e.features[0].properties["発生日時_月"] +
    "月" +
    e.features[0].properties["発生日時_日"] +
    "日" +
    e.features[0].properties["発生日時_時"] +
    "時" +
    e.features[0].properties["発生日時_分"] +
    "分";
  var tenko = e.features[0].properties["天候"];
  var chikei = e.features[0].properties["地形"];
  var romenjotai = e.features[0].properties["路面状態"];
  var dorokeijo = e.features[0].properties["道路形状"];
  var shingoki = e.features[0].properties["信号機"];
  var shadofukuin = e.features[0].properties["車道幅員"];
  var dorosenkei = e.features[0].properties["道路線形"];
  var shototsuchiten = e.features[0].properties["衝突地点"];
  var zonkisei = e.features[0].properties["ゾーン規制"];
  var chuobunritaishisetsuto = e.features[0].properties["中央分離帯施設等"];
  var hoshadokubun = e.features[0].properties["歩車道区分"];
  var jikoruikei = e.features[0].properties["事故類型"];

  var nenrei_a = e.features[0].properties["年齢（当事者A）"];
  var nenrei_b = e.features[0].properties["年齢（当事者B）"];
  var tojishashubetsu_a = e.features[0].properties["当事者種別（当事者A）"];
  var tojishashubetsu_b = e.features[0].properties["当事者種別（当事者B）"];
  var yotobetsu_a = e.features[0].properties["用途別（当事者A）"];
  var yotobetsu_b = e.features[0].properties["用途別（当事者B）"];
  var sharyokeijo_a = e.features[0].properties["車両形状（当事者A）"];
  var sharyokeijo_b = e.features[0].properties["車両形状（当事者B）"];
  var sokudokisei_a =
    e.features[0].properties["速度規制（指定のみ）（当事者A）"];
  var sokudokisei_b =
    e.features[0].properties["速度規制（指定のみ）（当事者B）"];
  var ichijiteishikisei_hyoshiki_a =
    e.features[0].properties["一時停止規制_標識（当事者A）"];
  var ichijiteishikisei_hyoji_a =
    e.features[0].properties["一時停止規制_表示（当事者A）"];
  var ichijiteishikisei_hyoshiki_b =
    e.features[0].properties["一時停止規制_標識（当事者B）"];
  var ichijiteishikisei_hyoji_b =
    e.features[0].properties["一時停止規制_表示（当事者B）"];
  var sharyonoshototsubui_a =
    e.features[0].properties["車両の衝突部位（当事者A）"];
  var sharyonoshototsubui_b =
    e.features[0].properties["車両の衝突部位（当事者B）"];
  var sharyonosonkaiteido_a =
    e.features[0].properties["車両の損壊程度（当事者A）"];
  var sharyonosonkaiteido_b =
    e.features[0].properties["車両の損壊程度（当事者B）"];
  var eabaggunosobi_a = e.features[0].properties["エアバッグの装備（当事者A）"];
  var eabaggunosobi_b = e.features[0].properties["エアバッグの装備（当事者B）"];
  var saidoeabaggunosobi_a =
    e.features[0].properties["サイドエアバッグの装備（当事者A）"];
  var saidoeabaggunosobi_b =
    e.features[0].properties["サイドエアバッグの装備（当事者B）"];
  var jinshinsonshoteido_a =
    e.features[0].properties["人身損傷程度（当事者A）"];
  var jinshinsonshoteido_b =
    e.features[0].properties["人身損傷程度（当事者B）"];

  new maplibregl.Popup()
    .setLngLat(e.lngLat)
    .setHTML(
      // 事故内容
      "<b>" +
        "<big>" +
        '<font color="blue">' +
        "事故内容: " +
        jikonaiyo +
        "</font>" +
        "</big>" +
        "</b>" +
        "<br>" +
        "発生日時: " +
        hasseinichiji +
        "<br>" +
        "路線名: " +
        rosemmei +
        "<br>" +
        "上下線: " +
        jogesen +
        "<br>" +
        "死者数: " +
        shishasu +
        "<br>" +
        "負傷者数: " +
        fushoshasu +
        "<br>" +
        "天候: " +
        tenko +
        "<br>" +
        "地形: " +
        chikei +
        "<br>" +
        "路面状態: " +
        romenjotai +
        "<br>" +
        "道路形状: " +
        dorokeijo +
        "<br>" +
        "信号機: " +
        shingoki +
        "<br>" +
        "車道幅員: " +
        shadofukuin +
        "<br>" +
        "道路線形: " +
        dorosenkei +
        "<br>" +
        "衝突地点: " +
        shototsuchiten +
        "<br>" +
        "ゾーン規制: " +
        zonkisei +
        "<br>" +
        "中央分離帯施設等: " +
        chuobunritaishisetsuto +
        "<br>" +
        "歩車道区分: " +
        hoshadokubun +
        "<br>" +
        "事故類型: " +
        jikoruikei +
        "<br>" +
        // 表形式
        "<table " +
        'style="font-size: 9pt; table-layout: fixed;"' +
        ">" +
        "<tr>" +
        '<th width="140">' +
        "項目" +
        "</th> " +
        '<th width="100">' +
        "当事者A" +
        "</th> " +
        '<th width="100">' +
        "当事者B" +
        "</th>" +
        "</tr>" +
        "<tr>" +
        "<td>" +
        "年齢層" +
        "</td> " +
        "<td>" +
        nenrei_a +
        "</td> " +
        "<td>" +
        nenrei_b +
        "</td>" +
        "</tr>" +
        "<tr>" +
        "<td>" +
        "当事者種別" +
        "</td> " +
        "<td>" +
        tojishashubetsu_a +
        "</td> " +
        "<td>" +
        tojishashubetsu_b +
        "</td>" +
        "</tr>" +
        "<tr>" +
        "<td>" +
        "車両の衝突部位" +
        "</td> " +
        "<td>" +
        sharyonoshototsubui_a +
        "</td> " +
        "<td>" +
        sharyonoshototsubui_b +
        "</td>" +
        "</tr>" +
        "<tr>" +
        "<td>" +
        "車両の損壊程度" +
        "</td> " +
        "<td>" +
        sharyonosonkaiteido_a +
        "</td> " +
        "<td>" +
        sharyonosonkaiteido_b +
        "</td>" +
        "</tr>" +
        "<tr>" +
        "<td>" +
        "人身損傷程度" +
        "</td> " +
        "<td>" +
        jinshinsonshoteido_a +
        "</td> " +
        "<td>" +
        jinshinsonshoteido_b +
        "</td>" +
        "</tr>" +
        "<tr>" +
        "<td>" +
        "用途別" +
        "</td> " +
        "<td>" +
        yotobetsu_a +
        "</td> " +
        "<td>" +
        yotobetsu_b +
        "</td>" +
        "</tr>" +
        "<tr>" +
        "<td>" +
        "車両形状" +
        "</td> " +
        "<td>" +
        sharyokeijo_a +
        "</td> " +
        "<td>" +
        sharyokeijo_b +
        "</td>" +
        "</tr>" +
        "<tr>" +
        "<td>" +
        "速度規制（指定のみ）" +
        "</td> " +
        "<td>" +
        sokudokisei_a +
        "</td> " +
        "<td>" +
        sokudokisei_b +
        "</td>" +
        "</tr>" +
        "<tr>" +
        "<td>" +
        "一時停止規制_標識" +
        "</td> " +
        "<td>" +
        ichijiteishikisei_hyoshiki_a +
        "</td> " +
        "<td>" +
        ichijiteishikisei_hyoshiki_b +
        "</td>" +
        "</tr>" +
        "<tr>" +
        "<td>" +
        "一時停止規制_表示" +
        "</td> " +
        "<td>" +
        ichijiteishikisei_hyoji_a +
        "</td> " +
        "<td>" +
        ichijiteishikisei_hyoji_b +
        "</td>" +
        "</tr>" +
        "<tr>" +
        "<td>" +
        "ｴｱﾊﾞｯｸﾞの装備" +
        "</td> " +
        "<td>" +
        eabaggunosobi_a +
        "</td> " +
        "<td>" +
        eabaggunosobi_b +
        "</td>" +
        "</tr>" +
        "<tr>" +
        "<td>" +
        "ｻｲﾄﾞｴｱﾊﾞｯｸﾞの装備" +
        "</td> " +
        "<td>" +
        saidoeabaggunosobi_a +
        "</td> " +
        "<td>" +
        saidoeabaggunosobi_b +
        "</td>" +
        "</tr>" +
        "<table>" +
        "座標: " +
        lat.toFixed(7) +
        "," +
        lng.toFixed(7) +
        " ※事故発生位置の座標<br>" +
        "<a href=https://www.google.com/maps?q=" +
        lat +
        "," +
        lng +
        "&hl=ja' target='_blank'>🌎Google Maps</a>" +
        " " +
        "<a href=https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=" +
        lat +
        "," +
        lng +
        "&hl=ja' target='_blank'>📷Street View</a>"
    )
    .addTo(map);
});
