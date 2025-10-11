export interface Cipher {
  readonly name: string; //Ceasar aes gibi algoritma adları. salt okunur çünkü alg. ismi her nesne için özeldir.

  encrypt(plain: string, key: unknown): string; //şifreleme: metin ve anahtarı parametre olarak alıyor dönüş tipi string


  decrypt(cipher: string, key: unknown): string; //şifre çözme şifreli metin ve anahtarı parametre olarak alıyor. dönüş tipi string
}

  // bilerek key türünü unknow yaptık farklı türde keyler gelebilir.