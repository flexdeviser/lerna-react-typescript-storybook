import html2canvas from 'html2canvas';

/**
 * export png or data
 */
export class ExportUtils {
  public static exportCsv(content: string, fileName: string): void {
    // simulate click "<a>"
    const downloadDom: HTMLAnchorElement = document.createElement('a');
    const mimeType = 'application/octet-stream';
    if (URL && 'download' in downloadDom) {
      //html5 A[download]
      downloadDom.href = URL.createObjectURL(
        new Blob([content], {
          type: mimeType,
        }),
      );
      downloadDom.setAttribute('download', fileName);
      document.body.appendChild(downloadDom);
      downloadDom.click();
      document.body.removeChild(downloadDom);
    }
  }

  public static saveAsImage(graphDiv: HTMLElement, fileName: string): void {
    if (graphDiv) {
      // to blob and then download
      html2canvas(graphDiv).then((canvas) => {
        canvas.toBlob((blobData) => {
          if (blobData) {
            const downloadDom: HTMLAnchorElement = document.createElement('a');
            if (URL && 'download' in downloadDom) {
              //html5 A[download]
              downloadDom.href = URL.createObjectURL(blobData);
              downloadDom.setAttribute('download', fileName);
              document.body.appendChild(downloadDom);
              downloadDom.click();
              document.body.removeChild(downloadDom);
            }
          }
        });
      });
    }
  }
}
