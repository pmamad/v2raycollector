import { appendFile, mkdir } from "node:fs/promises";
import channles from "./telegram_channels.json" assert { type: "json" };
//--------------------------------------------------------- Type & Interfaces
type Result = Record<"config" | "country" | "typeConfig", string>;
type FinalResult = Record<"protocol", string> & Result;

interface IPApiResponse {
  country: string;
  query: string;
  countryCode: string;
}
//---------------------------------------------------------- Variable
const countGetConfigOfEveryChannel = 20;
const CHANNEL_CONCURRENCY = 8;
const IP_CHECK_CONCURRENCY = 2;
const IP_CHECK_DELAY_MS = 400;
const FETCH_TIMEOUT_MS = 15_000;
const FETCH_RETRIES = 3;
const IP_CHECK_URL =
  process.env.IP_CHECK_URL ?? "https://www.irjh.top/py/check/ip.php?ip=";
const CONFIG_NAME_SUFFIX = "%40vpn_mall";

const seenConfigs = new Set<string>();
const countryFlagMap: { [key: string]: string } = {
  AF: "🇦🇫",
  AL: "🇦🇱",
  DZ: "🇩🇿",
  AD: "🇦🇩",
  AO: "🇦🇴",
  AG: "🇦🇬",
  AR: "🇦🇷",
  AM: "🇦🇲",
  AU: "🇦🇺",
  AT: "🇦🇹",
  AZ: "🇦🇿",
  BS: "🇧🇸",
  BH: "🇧🇭",
  BD: "🇧🇩",
  BB: "🇧🇧",
  BY: "🇧🇾",
  BE: "🇧🇪",
  BZ: "🇧🇿",
  BJ: "🇧🇯",
  BT: "🇧🇹",
  BO: "🇧🇴",
  BA: "🇧🇦",
  BW: "🇧🇼",
  BR: "🇧🇷",
  BN: "🇧🇳",
  BG: "🇧🇬",
  BF: "🇧🇫",
  BI: "🇧🇮",
  CV: "🇨🇻",
  KH: "🇰🇭",
  CM: "🇨🇲",
  CA: "🇨🇦",
  CF: "🇨🇫",
  TD: "🇹🇩",
  CL: "🇨🇱",
  CN: "🇨🇳",
  CO: "🇨🇴",
  KM: "🇰🇲",
  CG: "🇨🇬",
  CR: "🇨🇷",
  HR: "🇭🇷",
  CU: "🇨🇺",
  CY: "🇨🇾",
  CZ: "🇨🇿",
  CD: "🇨🇩",
  DK: "🇩🇰",
  DJ: "🇩🇯",
  DM: "🇩🇲",
  DO: "🇩🇴",
  EC: "🇪🇨",
  EG: "🇪🇬",
  SV: "🇸🇻",
  GQ: "🇬🇶",
  ER: "🇪🇷",
  EE: "🇪🇪",
  SZ: "🇸🇿",
  ET: "🇪🇹",
  FJ: "🇫🇯",
  FI: "🇫🇮",
  FR: "🇫🇷",
  GA: "🇬🇦",
  GM: "🇬🇲",
  GE: "🇬🇪",
  DE: "🇩🇪",
  GH: "🇬🇭",
  GR: "🇬🇷",
  GD: "🇬🇩",
  GT: "🇬🇹",
  GN: "🇬🇳",
  GW: "🇬🇼",
  GY: "🇬🇾",
  HT: "🇭🇹",
  HN: "🇭🇳",
  HU: "🇭🇺",
  IS: "🇮🇸",
  IN: "🇮🇳",
  ID: "🇮🇩",
  IR: "🇮🇷",
  IQ: "🇮🇶",
  IE: "🇮🇪",
  IL: "🇮🇱",
  IT: "🇮🇹",
  JM: "🇯🇲",
  JP: "🇯🇵",
  JO: "🇯🇴",
  KZ: "🇰🇿",
  KE: "🇰🇪",
  KI: "🇰🇮",
  KW: "🇰🇼",
  KG: "🇰🇬",
  LA: "🇱🇦",
  LV: "🇱🇻",
  LB: "🇱🇧",
  LS: "🇱🇸",
  LR: "🇱🇷",
  LY: "🇱🇾",
  LI: "🇱🇮",
  LT: "🇱🇹",
  LU: "🇱🇺",
  MG: "🇲🇬",
  MW: "🇲🇼",
  MY: "🇲🇾",
  MV: "🇲🇻",
  ML: "🇲🇱",
  MT: "🇲🇹",
  MH: "🇲🇭",
  MR: "🇲🇷",
  MU: "🇲🇺",
  MX: "🇲🇽",
  FM: "🇫🇲",
  MD: "🇲🇩",
  MC: "🇲🇨",
  MN: "🇲🇳",
  ME: "🇲🇪",
  MA: "🇲🇦",
  MZ: "🇲🇿",
  MM: "🇲🇲",
  NA: "🇳🇦",
  NR: "🇳🇷",
  NP: "🇳🇵",
  NL: "🇳🇱",
  NZ: "🇳🇿",
  NI: "🇳🇮",
  NE: "🇳🇪",
  NG: "🇳🇬",
  KP: "🇰🇵",
  MK: "🇲🇰",
  NO: "🇳🇴",
  OM: "🇴🇲",
  PK: "🇵🇰",
  PW: "🇵🇼",
  PS: "🇵🇸",
  PA: "🇵🇦",
  PG: "🇵🇬",
  PY: "🇵🇾",
  PE: "🇵🇪",
  PH: "🇵🇭",
  PL: "🇵🇱",
  PT: "🇵🇹",
  QA: "🇶🇦",
  RO: "🇷🇴",
  RU: "🇷🇺",
  RW: "🇷🇼",
  KN: "🇰🇳",
  LC: "🇱🇨",
  VC: "🇻🇨",
  WS: "🇼🇸",
  SM: "🇸🇲",
  ST: "🇸🇹",
  SA: "🇸🇦",
  SN: "🇸🇳",
  RS: "🇷🇸",
  SC: "🇸🇨",
  SL: "🇸🇱",
  SG: "🇸🇬",
  SK: "🇸🇰",
  SI: "🇸🇮",
  SB: "🇸🇧",
  SO: "🇸🇴",
  ZA: "🇿🇦",
  KR: "🇰🇷",
  SS: "🇸🇸",
  ES: "🇪🇸",
  LK: "🇱🇰",
  SD: "🇸🇩",
  SR: "🇸🇷",
  SE: "🇸🇪",
  CH: "🇨🇭",
  SY: "🇸🇾",
  TW: "🇹🇼",
  TJ: "🇹🇯",
  TZ: "🇹🇿",
  TH: "🇹🇭",
  TL: "🇹🇱",
  TG: "🇹🇬",
  TO: "🇹🇴",
  TT: "🇹🇹",
  TN: "🇹🇳",
  TR: "🇹🇷",
  TM: "🇹🇲",
  TV: "🇹🇻",
  UG: "🇺🇬",
  UA: "🇺🇦",
  AE: "🇦🇪",
  GB: "🇬🇧",
  US: "🇺🇸",
  UY: "🇺🇾",
  UZ: "🇺🇿",
  VU: "🇻🇺",
  VA: "🇻🇦",
  VE: "🇻🇪",
  VN: "🇻🇳",
  YE: "🇾🇪",
  ZM: "🇿🇲",
  ZW: "🇿🇼",
  UN: "🏴‍☠️"
};

//---------------------------------------------------------- Tools
async function fetchWithRetry(
  url: string,
  init?: RequestInit
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < FETCH_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timeout);
      if (response.ok || response.status < 500) return response;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;
    }
    if (attempt < FETCH_RETRIES - 1) {
      await new Promise((resolve) =>
        setTimeout(resolve, 500 * (attempt + 1))
      );
    }
  }
  throw lastError;
}

async function runWithConcurrency<T>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<void>
): Promise<void> {
  let index = 0;
  async function worker(): Promise<void> {
    while (index < items.length) {
      const current = items[index++]!;
      await fn(current);
    }
  }
  const workers = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
}

class Semaphore {
  private current = 0;
  private readonly queue: (() => void)[] = [];

  constructor(private readonly max: number) {}

  async acquire(): Promise<void> {
    if (this.current < this.max) {
      this.current++;
      return;
    }
    await new Promise<void>((resolve) => this.queue.push(resolve));
    this.current++;
  }

  release(): void {
    this.current--;
    const next = this.queue.shift();
    if (next) next();
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}

const ipCheckSemaphore = new Semaphore(IP_CHECK_CONCURRENCY);

function decodeHtmlEntities(str: string): string {
  let decoded = str;
  try {
    decoded = decodeURIComponent(str);
  } catch {
    // keep original on malformed percent-encoding
  }
  return decoded
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}
function encodeBase64Unicode(obj: any): string {
  const json = JSON.stringify(obj);
  const uint8array = new TextEncoder().encode(json);
  return btoa(String.fromCharCode(...uint8array));
}
function decodeBase64Unicode(str: string): any {
  const binaryString = atob(str);
  const bytes = Uint8Array.from(binaryString, (c) => c.charCodeAt(0));
  const json = new TextDecoder().decode(bytes);
  return JSON.parse(json);
}
//---------------------------------------------------------- Functions
async function fetchHtml(url: string): Promise<void> {
  try {
    const response = await fetchWithRetry(url, { redirect: "manual" });
    if (!response.ok) {
      await appendFile(`./BadChannels.txt`, url + "\n");
      console.log(url);
      return;
    }
    const html: string = await response.text();

    const regex = /(vless|vmess|wireguard|trojan|ss):\/\/[^\s<>]+/gm;
    const matches = html.match(regex);

    if (matches) {
      const lastFiveMessages = matches.slice(-countGetConfigOfEveryChannel);

      for (const element of lastFiveMessages) {
        const decodeHtml = decodeHtmlEntities(element);

        if (!decodeHtml.includes("…")) {
          await Grouping(decodeHtml);
        } else {
          await appendFile(`./BadChannels.txt`, url + "\n");
        }

      }
    } else {
      await appendFile(`./BadChannels.txt`, url + "\n");
      console.log(url);
    }
  } catch (error) {
    await appendFile(`./BadChannels.txt`, url + "\n");
    console.log(url);
    //  console.log("Error fetching HTML:", error);
  }
}
async function vmessHandle(input: string): Promise<Result> {
  const configinfo = decodeBase64Unicode(input);

  const { flag, country, ip , countryCode } = await checkIP(configinfo.add);
  configinfo.ps = `${flag} ${countryCode} | ${ip}${CONFIG_NAME_SUFFIX}`;

  return {
    config: encodeBase64Unicode(configinfo),
    country: country,
    typeConfig: configinfo.net,
  };
}
async function configChanger(urlString: string): Promise<FinalResult> {
  const protocol = urlString.split("://")[0] + "";
  let config, country, typeConfig;

  if (protocol == "vmess") {
    const vmesconf = await vmessHandle(urlString.split("://")[1] + "");

    config = "vmess://" + vmesconf.config;
    country = vmesconf.country;
    typeConfig = vmesconf.typeConfig;
  }
  else {
    const { hostname, searchParams } = new URL(urlString);

    const api = await checkIP(hostname);

    typeConfig = searchParams.get("type") ?? "";
    country = api.country;
    config =
      urlString.split("#")[0] +
      "#" +
      `${api.flag} ${api.countryCode} | ${api.ip}${CONFIG_NAME_SUFFIX}`;
  }
  return { protocol, config, country, typeConfig };
}
async function checkIP(ipaddress: string) {
  return ipCheckSemaphore.run(async () => {
    console.log("Check Ip ...");
    await new Promise((resolve) => setTimeout(resolve, IP_CHECK_DELAY_MS));

    let data: Partial<IPApiResponse> = {};

    try {
      const response = await fetchWithRetry(
        `${IP_CHECK_URL}${encodeURIComponent(ipaddress)}`
      );

      if (!response.ok) {
        console.log(`HTTP error! status: ${response.status}`);
      } else {
        data = (await response.json()) as IPApiResponse;
      }
    } catch (error) {
      console.log("IP check failed:", ipaddress, error);
    }

    const country = data.country ?? "Unknown";
    const countryCode = data.countryCode ?? "UN";
    const flag = countryFlagMap[countryCode] ?? countryFlagMap.UN;
    const ip = data.query ?? ipaddress;

    return { country, flag, ip, countryCode };
  });
}
async function Grouping(urls: string): Promise<void> {
  console.log("Config :", urls + "\n");

  let finalResult: FinalResult;
  try {
    finalResult = await configChanger(urls);
  } catch (error) {
    console.log("Skipping invalid config:", urls, error);
    return;
  }

  if (seenConfigs.has(finalResult.config)) return;
  seenConfigs.add(finalResult.config);

  console.log("final Info :", finalResult, "\n");

  await appendFile(
    `./category/${finalResult.protocol}.txt`,
    finalResult.config + "\n"
  );
  await appendFile(
    `./category/${finalResult.country}.txt`,
    finalResult.config + "\n"
  );
  if (finalResult.typeConfig) {
    await appendFile(
      `./category/${finalResult.typeConfig}.txt`,
      finalResult.config + "\n"
    );
  }
}
async function startScaninig() {
  await mkdir("./category", { recursive: true });

  await runWithConcurrency(channles, CHANNEL_CONCURRENCY, async (value) => {
    console.log("Start Get From :" + value);
    await fetchHtml("https://t.me/s/" + value);
  });
}
startScaninig();