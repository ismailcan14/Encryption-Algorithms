import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const data = await request.json();
        const { operation, algorithm, type, inputLength, outputLength, time } = data;

        const operationLabel = operation === 'encrypt' ? 'ŞİFRELEME' : 'ŞİFRE ÇÖZME';
        const typeLabel = type || (algorithm?.includes('manual') ? 'Manuel (Kütüphanesiz)' : 'Kütüphane Tabanlı');

        console.log(
            `[${operationLabel}] Algoritma: ${algorithm} | ` +
            `Tür: ${typeLabel} | ` +
            `Giriş: ${inputLength} kar | ` +
            `Çıkış: ${outputLength} kar | ` +
            `Süre: ${time} ms`
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
}
