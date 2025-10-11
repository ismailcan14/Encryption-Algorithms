import { Cipher } from "../type";
import {AZ,idx} from "../alph";




export class CaesarCipher implements Cipher
{
  readonly name="caesar";
  private  norm(k: number, m: number):number
{
  return ((k % m) + m) % m;
}
 private asNumber(key: unknown): number {
    const n = typeof key === "number" ? key : Number(key);
    if (!Number.isFinite(n)) throw new Error("CaesarCipher: Anahtar bir sayı sayı");
    return n;
  }

  encrypt(plain:string,key:unknown): string
  //plain düz metin key ise anahtarımız örneğin 3 , 5 
  {
    const k =this.asNumber(key); //gelen keyi i number formatına çeviriyoruz.
    const sh=this.norm(k,AZ.length); //gelen key AZ den büyükse veya - ise normalize ediyoruz.
   let result = ""; // şifreli sonucu burada tutacağız.

for (let j = 0; j < plain.length; j++) { //plaindeki tüm harfleri gezecek for döngüsü
  const ch = plain[j];//ch, j. indexdeki harf
  const i = idx(ch); //i, AZ deki harfe karşılık gelen index
  if (i < 0) {
    // AZ de bir karşılığı yoksa i negatif dönüyor. eğer negatif ise :
    result += ch;//resul a direkt ekle
  } else {
    // ch bir harf ise : 
    const newIndex = (i + sh) % AZ.length; //yeni indexi belirleme
    const encCh = AZ[newIndex];            // yeni index e göre yeni harfi AZ den seçiyoruz.
    result += encCh;                       // yeni harfi şifreli metine ekliyoruz.
  }
  //örnek olarak TÜRKİYE yi kontrol ederken R harfine geldik diyelim. ch=3 i=22 oluyor. yeni index i belirlerken  25%32=25 oluyor
  //R yerine AZ[newIndex] 25 geliyor. bu da T harfi.
}

return result; //şifreli metini geri döndürüyoruz.
  }

 decrypt(cipher:string,key:unknown):string
 {
    const k=this.asNumber(key); //anahtarı number a  çevir.
    return this.encrypt(cipher,-k); //ters anahtarla şifreli metini şifreleme fonksiyonuna yolla
 }
}


//BASİT ÖRNEK : 

/*
kelime : ARI

encrpyt fonksiyonuna kelime olarak ARI ve key olarak 3 geldiğini varsayalım.

döngü 3 defa dönecek:
1)A  AZ deki index i 0. i=0 oldu sh de keyi temsil ediyor yani sh=3;
newIndex = i+sh den 3 oldu. AZ deki değeri Ç harfi.

2)R AZ deki indexi 21. i=21 oldu . sh=3
newIndex=3+21 den 24 oldu. AZ deki değeri T harfi.

3)I AZ deki indexi 10. i= 10 oldu. sh=3
newIndex = 10 + 3 den 13 oldu AZ deki değeri K harfi.

ŞİFRELİ METİN : ÇTK

Çözmek için ÇTK yı decrpt fonksiyonuna yolladık
key olarak da -3 gidiyor

key -3 olduğu için normalize ediliyor. 
şu şekilde : -3%32 = -3 çıkar -3 + 32 = 29 çıkar.  29%32 = 29 çıkar. sh = 29 oldu

1) Ç harfi girdi döngüye 
 k=-3
 sh=29 oldu
 plaindeki j. yani 0. index Ç harfi ch= Ç oldu
 Ç nin AZ deki index karsılıgı 3 . i=3 oldu.

 newIndex=i+sh => 3+29 dan 32 oldu 32%AZ.length= 0  AZ deki karşılığı A harfi resul a A yı ekliyoruz. bu şekilde devam ediyor ve 
 //Şifre çözülüyor!!

 

*/
   

