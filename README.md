# Pametni dom

Lastna spletna nadzorna plošča za pametne inštalacije: odkrivanje naprav, vklop/izklop in dashboard po meri.

## Kaj zmore

- Prilagodljiv dashboard (ploščice za naprave, prostore, prizore, uro)
- Ročno dodajanje naprav (Shelly, Tasmota, generic HTTP, demo)
- Sken lokalnega WiFi omrežja za Shelly in Tasmota
- Uvoz entitet iz Home Assistant
- Lokalni most za krmiljenje LAN naprav, ko je aplikacija na Vercelu (HTTPS)
- PIN zaklep za javno domeno

## Pomembno o WiFi skenu

Aplikacija na Vercelu **ne vidi tvojega domačega WiFi**. Strežnik teče v oblaku, naprave pa so v LAN (`192.168.x.x`).

Delujoče poti:

1. **Home Assistant** — najboljša izbira, če ga že imaš. Aplikacija kliče HA prek HTTPS (Nabu Casa ali VPN).
2. **Lokalni most** — majhen Node strežnik (`npm run bridge`) na Raspberry Pi / NAS. Izpostaviš ga prek Cloudflare Tunnel ali Tailscale, Vercel pa nanj pošilja ukaze.
3. **Lokalni zagon** — `npm run dev` v istem omrežju. Brskalnik lahko neposredno kliče Shelly/Tasmota, če stran ni HTTPS.

## Lokalni zagon

```bash
npm install
npm run dev
```

Odpri [http://localhost:3000](http://localhost:3000).

## Lokalni most

Na računalniku, ki je vedno v istem WiFi kot naprave:

```bash
set BRIDGE_TOKEN=dolg-skrivni-niz
npm run bridge
```

Most posluša na vratih `8787`. Za HTTPS iz interneta uporabi Cloudflare Tunnel:

```bash
cloudflared tunnel --url http://localhost:8787
```

URL tunela in isti `BRIDGE_TOKEN` vpiši v Nastavitve aplikacije.

## GitHub

```bash
git init
git add .
git commit -m "Prva različica pametnega doma"
gh repo create smarthome --private --source=. --remote=origin --push
```

## Vercel

1. Na [vercel.com](https://vercel.com) poveži GitHub repozitorij.
2. Framework: Next.js, ukaza za build/start pusti privzeta.
3. Po prvem deployu dobiš naslov `tvoj-projekt.vercel.app`.

Opcijsko v Vercel Environment Variables:

- `BRIDGE_URL` — HTTPS naslov mostu
- `BRIDGE_TOKEN` — isti žeton kot na mostu

## Domena pri Neoserv

V Vercel: Project → Settings → Domains → dodaj `tvoja-domena.si` in `www.tvoja-domena.si`.

V Neoserv DNS:

| Ime | Tip | Vrednost |
| --- | --- | --- |
| `@` | A | `76.76.21.21` |
| `www` | CNAME | `cname.vercel-dns.com` |

Če Neoserv podpira ALIAS/ANAME za golo domeno, lahko `@` usmeriš na `cname.vercel-dns.com`. Po širjenju DNS (običajno nekaj minut do ure) Vercel izda HTTPS certifikat.

## Varnost

Ker bo nadzorna plošča na javni domeni, nastavi PIN v Nastavitvah. Most zaščiti z `BRIDGE_TOKEN`. Home Assistant žetona ne deli javno.
