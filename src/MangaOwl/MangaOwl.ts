import { Source, Manga, Chapter, ChapterDetails, HomeSectionRequest, HomeSection, MangaTile, SearchRequest, Request, MangaUpdates, MangaStatus, LanguageCode } from "paperback-extensions-common"

export class MangaOwl extends Source {

    constructor(cheerio: CheerioAPI) {
        super(cheerio)
    }

    get version(): string { return '1.0.0' }
    get name(): string { return 'MangaOwl' }
    get icon(): string { return 'icon.png' }
    get author(): string { return 'Syn' }
    get authorWebsite(): string { return 'https://github.com/Synstress' }
    get description(): string { return 'Extension that pulls manga from MangaOwl, includes Advanced Search and Updated manga fetching' }
    get hentaiSource(): boolean { return false }

    get rateLimit() { return 100 }
    getMangaDetailsRequest(ids: string[]): Request[] {
        return [createRequestObject({
            metadata: ids[0],
            url: "https://mangaowl.net/single/" + ids[0] + "/pp",
            method: 'GET'
        })]
    }
    getMangaDetails(data: any, metadata: any): Manga[] {
        let $ = this.cheerio.load(data)
        let mangaInfo = $(".single_details")
        let mangaProps = $('div:nth-child(2) p', mangaInfo).toArray()
        let manga = {
            id: metadata,
            titles: [$('h2', mangaProps).text()],
            image: $('div:nth-child(1) img', mangaInfo).attr('src')!.replace(/^(\/\/)/gi, 'https://'),
            rating: 0,
            status: MangaStatus.ONGOING,
            artist: "",
            author: "",
            desc: $('.single_detail .description').text().replace(/^\./gi, ''),
        }
        for (let prop of mangaProps) {
            let propertyValue = $(prop).text().toLowerCase()

            if (propertyValue.includes('rating')) {
                manga.rating = Number($('font', prop).text())
            } else if (propertyValue.includes('status')) {
                let status = $(prop).contents().filter((_, x) => {
                    return x.type === 'text';
                }).text();
                manga.status = status.toLowerCase().includes('ongoing') ? MangaStatus.ONGOING : MangaStatus.COMPLETED
            } else if (propertyValue.includes('author')) {
                let author = $(prop).contents().filter((_, x) => {
                    return x.type === 'text';
                }).text();
                manga.author = author
            } else if (propertyValue.includes('artist')) {
                let artist = $(prop).contents().filter((_, x) => {
                    return x.type === 'text'
                }).text();
                manga.artist = artist
            }
        }
        return [createManga(manga)]
    }
    getChaptersRequest(mangaId: string): Request {
        return createRequestObject({
            metadata: mangaId,
            url: "https://mangaowl.net/" + mangaId,
            method: 'GET'
        })
    }
    getChapters(data: any, metadata: any): Chapter[] {
        let $ = this.cheerio.load(data)
        let chapters = $('.table-chapter-list .list-group-item.chapter_list').toArray()
        let chapterList = []
        let chapterStrRegex = /(chapter)\s?(\d+)/gi
        let chapterNumberRegex = /(\d+$)/gi
        for (let chapter of chapters) {
            let chapNum = $('label.chapter-title', chapter).text().match(chapterStrRegex)![0].match(chapterNumberRegex)!
            // paste stuff here from now on
            chapterList.push(createChapter({
                id: $('.chapter-url', chapter).attr('chapter-id')!,
                chapNum: Number(chapNum[0]),
                langCode: LanguageCode.ENGLISH,
                volume: 0,
                mangaId: metadata.mangaId,
                name: "",
                time: new Date($('.chapter-url small', chapter).text()),
            }))
        }
        return chapterList
    }
    searchRequest(query: SearchRequest, page: number): Request | null {
        return createRequestObject({
            url: "https://mangaowl.net/search/1?search=" + encodeURI(query.title ?? ""),
            method: "GET"
        })
    }
    search(data: any, metadata: any): MangaTile[] | null {
        let $ = this.cheerio.load(data)
        let searchResults = $('.flexslider comicView').toArray()
        let mangas = []
        for (let result of searchResults) {
            mangas.push(createMangaTile({
                id: $(result).attr('data-id')!,
                image: $('.comic_thumbnail', result).attr('data-background-image')!,
                title: createIconText({ text: $('.comic_title', result).text() }),
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
            domain: "https://www.mangareader.net"
          })],
          metadata: {
            chapId: chapId,
            mangaId: mangaId
          }
        })
      }
    
      getChapterDetails(data: any, metadata: any): ChapterDetails {
        let $ = this.cheerio.load(data, { xmlMode: false })
    
        let allPages: any = eval("let document = {}; " + $("#main script").html() + "; document['mj'];")
    
        let pages = []
        for (let page of allPages.im) {
          pages.push(page.u.replace(/^(\/\/)/g, 'https://'))
        }
    
        return createChapterDetails({
          id: metadata.chapId,
          longStrip: false,
          mangaId: metadata.mangaId,
          pages: pages
        })
      }
    
}