# Footsal

Jednostavan foosball u pregledniku: Three.js, običan HTML i JS, bez builda. Vizual je grub. Težina je na kontroli jednom rukom na tipkovnici i drugom na mišu.

## Zaključano

- Jedna strana ima tri osovine. Tipke `1`, `2`, `3` biraju osovinu. Tipke se mogu rebindati.
- `1` je golman, `2` vezni red, `3` napad. Dok držim samo `3`, miš miče napad.
- Istovremeno su aktivne najviše dvije osovine. Ako su sve tri tipke dolje, aktivne su dvije zadnje stisnute.
- Miš lijevo–desno kliže aktivne osovine po šipki.
- Scroll drži nagib figura. Kut ostaje gdje ga scroll ostavi.
- Šut i dodavanje su lijevi klik: držanje puni jačinu, puštanje radi zamah prema protivničkom golu. Brzina punjenja kao u PES 6.
- Desni klik je backpass, isti zamah prema vlastitom golu. Strop mu je pola maksimalne snage šuta.
- Figura je pravokutna ploča, pomaknuta na osovini da se vide noge i glava.
- Magnet za prijem radi samo dok se drži razmaknica. Prebrza lopta se odbije. Krivi kut noge isto odbija loptu.
- Kamera stoji uz dugu stranu stola, iznad ruba, i gleda dolje na cijeli stol.
- Aktivne šipke nose highlight shader. Lagano sjenčanje i dalje čita nagib ploča.
- Gol je deadzone koji diže brojač. Sve van stola je deadzone bez boda.
- Svaki kickoff i reset šalje loptu iz centra, lagano, 50% prema jednom golu i 50% prema drugom.
- Prva verzija nema AI protivnika.

## Stol

Mjere su u metrima, blizu pravog stola, da se fizika može ugađati na stvarnim veličinama.

- Igralište oko 1.00 × 0.58. Uže je da golman dohvati loptu uz bočni zid kod gola.
- Lopta promjera oko 3.5 cm.
- Visina šipke takva da noga okomito dolje pogađa loptu oko sredine.

Po ekipi ima pet figura: golman, vezni red od tri, napad od dva. Šipke se izmjenjuju, s lijeva na desno, naš gol je lijevo:

| Red | Ekipa | Tipka | Figura |
| --- | --- | --- | --- |
| golman | A | 1 | 1 |
| napad | B |  | 2 |
| vezni | A | 2 | 3 |
| vezni | B |  | 3 |
| napad | A | 3 | 2 |
| golman | B |  | 1 |

Ekipa B stoji mirno. Nema AI. Te šipke su prepreka i tijelo u koje lopta može udariti. Ručke ekipe A izlaze prema nama, ručke ekipe B na suprotnu stranu.

Osi:

- `X` duž šipke, lijevo–desno
- `Y` gore
- `Z` od našeg gola prema protivničkom
- Nagib je rotacija oko `X`

## Figure

Jedna figura su dvije kutije na istoj šipki, ne model igrača.

- Gornja kutija je glava i trup.
- Donja kutija su noge.
- Šipka prolazi kroz gornji dio, ne kroz sredinu ploče. Noge vise ispod ose, pa se iz kuta odmah vidi što udara loptu.
- Noge i glava su blage razlike u boji, dovoljno da se zona čita i kad je ploča skoro u profilu.

Figura ne hoda i ne animira se. Cijela osovina kliže po `X` i rotira se oko `X`. Figure ostaju fiksirane duž šipke.

Svaka šipka ima svoj hod. Figure stanu na rubu stola i ne prolaze zid. Ako su dvije osovine aktivne, svaka se zaustavlja na svom rubu zasebno. Druga nastavlja pratiti miš.

## Kontrole

Jedna ruka drži tipke, druga miš.

### Odabir osovine

Po defaultu `1`, `2`, `3`. Rebind sprema izbor u `localStorage`. Isti ključ ne može ići na dvije osovine. `Escape` ostaje za otključavanje miša i ne može se bindati.

Stanje:

- `držane` — tipke koje su fizički dolje, s vremenom pritiska
- `aktivne` — najviše dvije, to su osovine koje miš stvarno vuče

Pritisak:

- Ako je ta osovina već aktivna, ništa se ne mijenja.
- Ako je aktivna samo jedna ili nijedna, nova ulazi u aktivne.
- Ako su već dvije aktivne, ispada ona koja je stisnuta ranije. Nova ulazi. Stara tipka može ostati fizički dolje, ali ta osovina više nije aktivna.

Puštanje:

- Ta osovina izlazi iz aktivnih i ostaje gdje jest, i po klizanju i po nagibu.
- Ako je neka treća tipka još dolje, a nije bila aktivna, ulazi na ispražnjeno mjesto. Od takvih čekajućih uzima se zadnja stisnuta.

Primjer: držim `1`, pa `2`, pa `3`. Aktivne postaju `2` i `3`. Pustim `3` i `1` je još dolje, pa su aktivne `2` i `1`.

Miš ne miče ništa dok nijedna osovina nije aktivna.

### Klizanje

`movementY` pomiče sve aktivne osovine za isti pomak. Osjetljivost je jedan parametar, ugađen tako da miran pokret zapešćem pređe veći dio hoda šipke.

Pokazivač se zaključava (`pointer lock`) da rub ekrana ne reže hod.

- Lijevi klik na stol dok pokazivač nije zaključan samo zaključava miš. Taj klik ne puni šut. Desni klik u tom stanju ne radi ništa.
- Daljnji lijevi klik, dok je zaključan, jest šut prema protivničkom golu.
- Desni klik, dok je zaključan, jest backpass prema vlastitom golu.
- Kontekstni izbornik na desni klik je ugašen.
- `Escape` otključava.

Na ovom kadru golovi su lijevo i desno, a šipka ide od bližeg ruba prema suprotnom. Klizanje prati tu os, pa se figure na ekranu miču gore–dolje. Miš se miče u tom smjeru.

### Nagib

Scroll je položaj noge, ne jačina šuta.

- Svaki korak kotačića dodaje isti kut aktivnim osovinama. Početno oko 8° po zarezu.
- Kut se drži. Puštanje kotačića ništa ne vraća.
- Kotačić ide puni krug, i dalje. Noge mogu stati iza lopte, ispod nje, ispred nje ili iznad nje.
- Svaka osovina pamti svoj kut. Scroll miče samo aktivne, za isti delta. Ne poravnava ih na isti apsolutni kut.
- Kad šut ili dodavanje završi, noga se vraća u okomitu, defaultnu poziciju. Scroll nakon toga kreće iz te pozicije.

## Šut, dodavanje i backpass

Lijevi i desni klik dijele isti mjerač i isti zamah. Razlikuju se smjer i strop.

- Lijevi klik dolje puni šut prema protivničkom golu.
- Desni klik dolje puni backpass. Ako noge već nisu ispred lopte, figura se okrene oko šipke dok noge ne završe ispred nje i tu ostane. To vrijedi i kad je lopta primljena s prednje strane. Ako su noge već ispred, backpass je kraći udarac natrag, do pola snage.
- Jačina raste istom brzinom. Puni šut je na maksimumu za oko 0.75 s. To je početna meta da punjenje sjedne brzinom kao u PES 6, i ostaje parametar.
- Backpass staje na pola tog maksimuma. Daljnje držanje ga ne diže. Pun backpass jednak je šutu napunjenom do pola.
- Iznad vlastitog stropa jačina stoji.
- U jednom trenutku puni se samo jedan klik. Onaj koji je prvi sišao određuje smjer i strop. Drugi se ignorira dok se prvi ne pusti.
- Puštanje pokreće brzi zamah. Jačina je kutna brzina tog zamaha.
- Zamah traje kratko, reda desetinke. Zatim se kut vrati na scroll.
- Za vrijeme zamaha magnet na tim nogama se gasi, da noga može pustiti loptu.
- Zamah ide na svaku aktivnu osovinu. Obje koje držim zamahnu.

Kratko držanje lijevog klika je dodavanje, duže je šut. Backpass je isti osjećaj, samo tiši i u drugu stranu.

Jačina ne ide u loptu kao nevidljivi impuls. Noga prolazi kroz prostor i sudar s loptom odrađuje udarac. Zato smjer i ovisi o tome gdje noga stoji i koliko brzo prođe.

## Lopta

Jedna kugla na ploči. Bočni rubovi je vraćaju dok je na stolu. Čim centar lopte napusti igru, igra staje i ide reset.

Dvije vrste deadzonea:

- **Gol.** Zona iza gol-linije, široka kao otvor gola. Ulazak gasi loptu, diže brojač te strane i zove reset. Oba gola broje. Gol u protivnički gol ide nama, gol u naš gol ide drugoj strani. Brojač je na ekranu, dva broja.
- **Van stola.** Sve izvan pravokutnika stola što nije gol. Lopta se gasi, brojač se ne dira, ide isti reset.

Gol se provjerava prije auta, da ulazak u gol ne padne u "van stola".

### Kickoff i reset

Isti izlaz nakon gola, auta i početka partije.

- Lopta se stavlja u centar, brzina nula, pa odmah dobije mali guranac.
- Smjer je duž stola, prema jednom ili drugom golu.
- Izbor je 50% / 50%.
- Brzina je lagana: vidi se kamo je krenula, nije dodavanje i nije šut.

Trenje i magnet rade različit posao.

- Glava ima nisko trenje i nema magnet. Lopta se od nje odbije.
- Magnet nije stalno uključen. Radi samo dok se drži razmaknica, i samo na nogama aktivne šipke koja nije u zamahu.
- Doseg je i dalje kratak: kontakt i neposredna blizina noge.
- Prijem traži kut. Ploča noge mora biti okrenuta prema lopti. Ako lopta dođe sa strane ploče, magnet se ne pali i lopta se odbije.
- Ako je lopta prebrza, otprilike iznad 1.15 m/s u odnosu na nogu, magnet je se ne prima. Odbija se od igrača.
- Kad prijem sjedne, hvatanje je mekano, a držanje čvrsto. Sporo voženje noge vodi loptu. Puštanje razmaknice pušta loptu.

Početne konstante, sve se ugađaju u igri:

| Parametar | Početak |
| --- | --- |
| Puno punjenje šuta | 0.75 s |
| Strop backpassa | 50% maksimalne snage šuta |
| Kut po zarezu scrolla | 8° |
| Raspon nagiba | puni krug |
| Doseg magneta | otprilike pola promjera lopte od površine noge |
| Magnet | samo dok se drži razmaknica |
| Maks. brzina prijema | 1.15 m/s |
| Kut prijema | ploča okrenuta prema lopti, otprilike unutar 45° |
| Trenje glave | slabo |

## Vizual

Dovoljno je da se u igri vidi koja je šipka aktivna, kuda noge gledaju i gdje je lopta.

- Kamera je uz dugu stranu, iznad ruba, pod kutom dolje na cijeli stol. Kao stajanje kraj stola. Nije pogled iza gola i nije tlocrt. Plohe ploča se vide, pa se nagib čita iz perspektive.
- Jedno bočno-gornje svjetlo i slab ambient. Lambert materijal, bez tekstura. Rotacija mijenja svjetlinu plohe.
- Aktivna šipka, i figura i šipka, prelazi na highlight shader: svijetli rub po konturi, dovoljno jak da se aktivni red vidi odmah, dovoljno tih da nagib i dalje čita obično svjetlo. Dvije aktivne šipke nose isti highlight. Neaktivne ostaju na običnom materijalu.
- Stol, šipke i golovi su ravne boje. Dva tima se razlikuju bojom ploča. Gol-zona i vanjski pojas mogu biti blago obojeni na podu da se vidi gdje lopta umire.

## Tehnika

Bez bundlera. `index.html` i moduli u `src/`, Three.js i Cannon.js preko import mape s CDN-a.

Fizika je Cannon.js, konkretno `cannon-es` (isti model, ES moduli). Three.js samo crta pozu tijela.

- Stol i rubovi su statični. Figure su kinermatske kutije.
- Lopta je dinamička kugla.
- Noge i glave su kutije. Noge imaju svoj materijal: trenje blizu maksimuma, odboj skoro nula. Glava ima slabo trenje i normalan odboj.
- Šipke koje držimo su `KINEMATIC`: pozu im pišemo iz kontrole, a brzinu iz razlike poze, da sudar prenese udarac.
- Magnet nije dio Cannona. Prije koraka, ako je lopta u dosegu noge aktivne šipke koja nije u zamahu, lopta dobije ograničen privlak i prati nogu.
- Gol i aut su zone izvan solvera: gol diže brojač, aut ne diže, oba zovu isti reset.
- Reset bira predznak brzine 50/50.

Korak je fiksan, 1/120 s, ostatak vremena ide u akumulator.

`index.html` je prototip za probu fizike: stol, obje strane šipki, lopta, kontrole, trenje, magnet, šut, backpass, gol, aut i kickoff. Rebind još nije u prototipu.

```
index.html
src/main.js       scena, petlja, svjetlo, HUD
src/constants.js  mjere i podesive vrijednosti
src/world.js      cannon-es svijet i materijali
src/input.js      tipke, miš, scroll, oba klika, pointer lock
src/rods.js       osovine, kutevi, hod, zamah, highlight shader
src/ball.js       lopta, trenje, magnet, gol, aut, kickoff
src/table.js      stol, rubovi, gol-zone
```

## Redoslijed

1. Prototip fizike u `index.html`: stol, šipke, lopta, Cannon, kontrole, magnet, šut, gol i kickoff.
2. Ugađanje trenja, magneta i brzine zamaha dok kontrola ne sjedne.
3. Rebind tipki.

Svaki korak se provjerava u pregledniku prije sljedećeg. Posebno: tri tipke držane odjednom, dvije šipke na rubu hoda, magnet koji pusti loptu u zamahu, scroll koji ne diže jačinu šuta, backpass koji stane na pola mjerača, gol koji broji, aut koji ne broji, i kickoff koji ide na obje strane.

## AI

Crvena strana je slab AI. Svakih 0.2 s gleda je li na putu lopte prema našem golu igrač.

- Ako jest, 15% šanse puca, a ostalih 85% dijeli pola-pola na pomak u stranu i kratko dodavanje.
- Ako nema nikoga na putu, samo se poravna s loptom i ne puca.
- Šut mu je ispod pune snage. Nakon šuta i dodavanja vraća se uspravno, isto kao igrač.
- Ako je lopta iza figurice, ne vrti šut u prazno. Magnetom je privuče i nogu dovede ispred lopte, pa tek onda bira šut, dodavanje ili pomak.
- Magnet uz zid vuče malo jače, da se lopta može skinuti s ograde.
