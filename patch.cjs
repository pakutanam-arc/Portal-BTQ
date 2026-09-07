const fs = require('fs');
let content = fs.readFileSync('src/components/QRScanner.tsx', 'utf8');

const target = `  useEffect(() => {
    const scannerId = "reader";
    const qrCodeSuccessCallback = (decodedText: string, decodedResult: any) => {
      onScanSuccess(decodedText);
      setLastScanned("Terscan!");
      setTimeout(() => setLastScanned(null), 1500);
      // Optional: don't stop the scanner immediately so we can do continuous scanning
    };
        
    const qrCodeErrorCallback = (errorMessage: string) => {
      // Ignored to prevent console spam
    };

    scannerRef.current = new Html5Qrcode(scannerId);
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };`;

const replacement = `  useEffect(() => {
    const scannerId = "reader";
    const qrCodeSuccessCallback = async (decodedText: string, decodedResult: any) => {
      try {
        const result = await onScanSuccess(decodedText);
        if (result && typeof result === 'string') {
          setError(result);
          setTimeout(() => setError(''), 4000);
        } else {
          setLastScanned("Terscan!");
          setTimeout(() => setLastScanned(null), 1500);
        }
      } catch (e) {
        console.error("Error handling scan", e);
      }
    };
        
    const qrCodeErrorCallback = (errorMessage: string) => {
      // Ignored to prevent console spam
    };

    scannerRef.current = new Html5Qrcode(scannerId);
    // Enforce 1:1 aspect ratio so it displays correctly inside the square container
    const config = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };`;

content = content.replace(target, replacement);
fs.writeFileSync('src/components/QRScanner.tsx', content);
console.log("Patched QRScanner.tsx");
