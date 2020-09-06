import { Source, Manga, Chapter, ChapterDetails, HomeSectionRequest, HomeSection, MangaTile, SearchRequest, Request, MangaUpdates, MangaStatus, LanguageCode } from "paperback-extensions-common"

export class MangaReader extends Source {

  constructor(cheerio: CheerioAPI) {
    super(cheerio)
  }

  get version(): string { return '1.0.18' }
  get name(): string { return 'MangaReader' }
  get icon(): string { return 'icon.png' }
  get author(): string { return 'Syn' }
  get authorWebsite(): string { return 'https://github.com/Synstress' }
  get description(): string { return 'Extension that pulls manga from MangReader, includes Advanced Search and Updated manga fetching' }
  get hentaiSource(): boolean { return false }

  get rateLimit() { return 100 }

  getMangaDetailsRequest(ids: string[]): Request[] {
    return [createRequestObject({
      metadata: ids[0],
      url: "https://mangareader.net/" + ids[0],
      method: 'GET',

    })]
  }
  getMangaDetails(data: any, metadata: any): Manga[] {
    let $ = this.cheerio.load(data);
    let status = $("#main table.d41 tr:nth-child(4) td:nth-child(2)").text().toLowerCase()


    return [createManga({
      id: metadata,
      titles: [$("#main .d40").text().replace(/\s?(manga)\s?$/gi, '')],
      image: $('#main .d38 img').attr('src')!.toString(),
      rating: 0,
      status: status == "ongoing" ? MangaStatus.ONGOING : MangaStatus.COMPLETED,
      artist: $("#main table.d41 tr:nth-child(6) td:nth-child(2)").text(),
      author: $("#main table.d41 tr:nth-child(5) td:nth-child(2)").text(),
      desc: $("#main .d46 p").text(),
      hentai: false
    })]
  }

  getChaptersRequest(mangaId: string): Request {
    return createRequestObject({
      metadata: mangaId,
      url: "https://mangareader.net/" + mangaId,
      method: 'GET',

    })
  }
  getChapters(data: any, metadata: any): Chapter[] {
    let $ = this.cheerio.load(data);
    let chapters = $("#main table.d48 tr:not([class])").toArray()
    let chapterList = []
    let nameRegex = /^(.+)(?=\s\d)/gi
    let chapterNumberRegex = /(\d+$)/gi
    for (let chapter of chapters) {
      let chapterTitleAnchor = $('a', chapter)
      let chapterNumber = chapterTitleAnchor.text().match(chapterNumberRegex)
      // paste stuff here from now on
      chapterList.push(createChapter({
        id: chapterNumber != null ? chapterNumber[0].toString() : "0",
        chapNum: Number(chapterNumber != null ? chapterNumber[0].toString() : "0"),
        langCode: LanguageCode.ENGLISH,
        volume: 0,
        mangaId: metadata,
        name: "",
        time: new Date($("td:nth-child(2)", chapter).text()),
      }))
    }
    return chapterList
  }

  searchRequest(query: SearchRequest, page: number): Request | null {
    return createRequestObject({
      url: "https://www.mangareader.net/search/?nsearch=&msearch=" + encodeURI(query.title ?? ""),
      method: "GET"
    })
  }
  search(data: any, metadata: any): MangaTile[] | null {
    let $ = this.cheerio.load(data);
    let searchResults = $("#ares table tr").toArray()

    let mangas = []
    for (let result of searchResults) {
      mangas.push(createMangaTile({
        id: $("a", result).attr('href')!.toString().replace(/\//gi, ''),
        image: $("div[data-src]", result).attr('data-src')!.toString().replace(/\/\//gi, 'https://'),
        title: createIconText({ text: $("a", result).text() })
      }))
    }

    return mangas
  }

  getChapterDetailsRequest(mangaId: string, chapId: string): Request {
    return createRequestObject({
      url: "https://mangareader.net/" + mangaId + "/" + chapId,
      method: 'GET',
      cookies: [createCookie({
        name: "drs",
        value: "2",
        domain: "https://mangareader.net"
      })] ,
      metadata: {
        chapId: chapId,
        mangaId: mangaId
      } 
    })
  }

  getChapterDetails(data: any, metadata: any): ChapterDetails {
    let $ = this.cheerio.load(data);
    let allPages = $("#main .d56 .mI img").toArray()
    let pages = []
    for (let page of allPages) {
      pages.push($(page).attr('src')!.toString().replace(/(?<=\=['"])\/\//g, 'https://'))
    }

    return createChapterDetails({
      id: metadata.chapId,
      longStrip: false,
      mangaId: metadata.mangaId,
      pages: pages
    })
  }
  }



