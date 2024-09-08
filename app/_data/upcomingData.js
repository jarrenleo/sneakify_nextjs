import { randomUUID } from "crypto";

const locales = {
  SG: "en-SG",
  MY: "en-MY",
  JP: "ja-JP",
  KR: "ko-KR",
  FR: "fr-FR",
  GB: "en-GB",
  CA: "en-CA",
  US: "en-US",
};

const currencies = {
  SG: "SGD",
  MY: "MYR",
  JP: "JPY",
  KR: "KRW",
  FR: "EUR",
  GB: "GBP",
  CA: "CAD",
  US: "USD",
};

const languages = {
  SG: "en-GB",
  MY: "en-GB",
  JP: "ja",
  KR: "ko",
  FR: "fr",
  GB: "en-GB",
  CA: "en-GB",
  US: "en",
};

async function fetchData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch nike data");

    const data = await response.json();
    if (!data.objects.length) throw new Error("No products found");

    return data;
  } catch (error) {
    throw Error(error.message);
  }
}

async function fetchUpcomingData(url, upcomingData = []) {
  try {
    const { pages, objects } = await fetchData(url);

    upcomingData.push(...objects);

    if (pages.next)
      return await fetchUpcomingData(
        `https://api.nike.com${pages.next}`,
        upcomingData,
      );

    return upcomingData;
  } catch (error) {
    throw Error(error.message);
  }
}

export async function getFirstUpcomingSKU(channel, country) {
  const language = languages[country];
  const upcomingData = await fetchUpcomingData(
    `https://api.nike.com/product_feed/threads/v3/?count=100&filter=marketplace(${country})&filter=language(${language})&filter=upcoming(true)&filter=channelName(${channel})&filter=exclusiveAccess(true,false)&sort=productInfo.merchProduct.commerceStartDateAsc`,
  );

  const upcomingProducts = [];

  for (const data of upcomingData) {
    const productsInfo = data?.productInfo;
    if (!productsInfo) continue;

    for (const productInfo of productsInfo) {
      if (productInfo.merchProduct.status === "CLOSEOUT") continue;

      const sku = productInfo.merchProduct.styleColor;
      const dateTimeObject = new Date(
        productInfo.launchView?.startEntryDate ||
          productInfo.merchProduct.commerceStartDate,
      );

      upcomingProducts.push({
        sku,
        dateTimeObject,
      });
    }
  }

  return upcomingProducts.sort((a, b) => a.dateTimeObject - b.dateTimeObject)[0]
    .sku;
}

function extractPublishedName(country, sku, publishedContent) {
  let publishedName;
  const title = publishedContent.properties.coverCard.title;
  const subtitle = publishedContent.properties.coverCard.subtitle;

  if (title && subtitle) {
    publishedName = `${subtitle} '${title}'`;
  } else {
    const seoTitle = publishedContent.properties.seo.title;
    if (!seoTitle.includes(sku)) return;

    let startIndex = 0;
    if (country === "JP" && seoTitle.includes("NIKE公式")) startIndex = 8;
    const endIndex = seoTitle.indexOf(sku) - 2;

    publishedName = seoTitle.slice(startIndex, endIndex);
  }

  return publishedName;
}

function formatPrice(price, country) {
  if (!price) return "-";

  const locale = locales[country];
  const currency = currencies[country];

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);
}

function formatDateTime(dateTimeObject, country, timeZone) {
  const locale = locales[country];

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
    timeZone,
  });

  const timeFormatter = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  });

  return [
    dateFormatter.format(dateTimeObject),
    timeFormatter.format(dateTimeObject).toUpperCase(),
  ];
}

function formatImageUrl(sku) {
  return `https://secure-images.nike.com/is/image/DotCom/${sku.replace(
    "-",
    "_",
  )}`;
}

export async function getUpcomingData(channel, country, timeZone) {
  try {
    const language = languages[country];
    const upcomingData = await fetchUpcomingData(
      `https://api.nike.com/product_feed/threads/v3/?count=100&filter=marketplace(${country})&filter=language(${language})&filter=upcoming(true)&filter=channelName(${channel})&filter=exclusiveAccess(true,false)&sort=productInfo.merchProduct.commerceStartDateAsc`,
    );

    const upcomingProducts = [];

    for (const data of upcomingData) {
      const productsInfo = data?.productInfo;
      if (!productsInfo) continue;

      for (const productInfo of productsInfo) {
        if (productInfo.merchProduct.status === "CLOSEOUT") continue;

        const id = randomUUID();
        const sku = productInfo.merchProduct.styleColor;

        let name = productInfo.productContent.fullTitle;
        if (channel === "SNKRS Web" && productsInfo.length === 1)
          name =
            extractPublishedName(country, sku, data.publishedContent) ||
            productInfo.productContent.fullTitle;

        const price = formatPrice(
          +productInfo.merchPrice.currentPrice,
          country,
          productInfo.merchPrice.currency,
        );
        const dateTimeObject = new Date(
          productInfo.launchView?.startEntryDate ||
            productInfo.merchProduct.commerceStartDate,
        );
        const [releaseDate, releaseTime] = formatDateTime(
          dateTimeObject,
          country,
          timeZone,
        );
        const imageUrl = formatImageUrl(sku);

        upcomingProducts.push({
          id,
          channel,
          name,
          sku,
          price,
          releaseDate,
          releaseTime,
          dateTimeObject,
          imageUrl,
        });
      }
    }

    const upcomingProductsSortedByDateTime = upcomingProducts.sort(
      (a, b) => a.dateTimeObject - b.dateTimeObject,
    );
    const upcomingProductsGroupedByDate =
      upcomingProductsSortedByDateTime.reduce((acc, product) => {
        if (!acc[product.releaseDate]) acc[product.releaseDate] = [];
        acc[product.releaseDate].push(product);

        return acc;
      }, {});

    return upcomingProductsGroupedByDate;
  } catch (error) {
    throw Error(error.message);
  }
}
