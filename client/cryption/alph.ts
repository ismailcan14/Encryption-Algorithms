export const AZ = "ABCÇDEFGĞHIİJKLMNOÖPQRSŞTUÜVWXYZ"; 
//tüm harflerin stringi
export const idx = (c: string) => AZ.indexOf(c.toLocaleUpperCase("tr"));
//istenilen harfi büyük harf yapar ve AZ deki index ini bulur.
export const norm = (k: number, m: number) => ((k % m) + m) % m;
//2 parametre alıyor ilki yani k key den gelen numara. 2. si ise AZ nin uzunluğu. örnek olarak k 3 AZ de 32 olsun.
//3%32 den 3 gelir onu 32+3=35 yaparız 35%32=3 çıkar. bu iyi bir sonuç
//ancak k=-4 olursa -4%32= -4 olur. -4+32=28 olur. 28%32 den 28 çıkar.
//NORMALİZASYON