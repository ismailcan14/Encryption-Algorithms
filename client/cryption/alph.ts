export const AZ = "ABCÇDEFGĞHIİJKLMNOÖPQRSŞTUÜVWXYZ"; //tüm harflerin stringi
export const idx = (c: string) => AZ.indexOf(c.toLocaleUpperCase("tr"));
//istenilen harfi büyük harf yapar ve AZ deki index ini bulur.