import { toPng } from 'html-to-image'

export async function generatePosterImage(element: HTMLElement) {
  await waitForImages(element)

  const dataUrl = await toPng(element, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: '#b8dce8',
  })

  return dataUrl
}

export async function downloadPosterImage(dataUrl: string, filename = '单词打卡.png') {
  const link = document.createElement('a')
  link.download = filename
  link.href = dataUrl
  link.click()
}

export async function dataUrlToBlob(dataUrl: string) {
  const response = await fetch(dataUrl)
  return response.blob()
}

export function openWeChatApp() {
  const ua = navigator.userAgent.toLowerCase()
  const isMobile = /iphone|ipad|ipod|android/i.test(ua)

  if (!isMobile) {
    return false
  }

  window.location.href = 'weixin://'
  return true
}

function waitForImages(element: HTMLElement) {
  const images = Array.from(element.querySelectorAll('img'))
  const pending = images.map(
    (img) =>
      new Promise<void>((resolve) => {
        if (img.complete) {
          resolve()
          return
        }
        img.onload = () => resolve()
        img.onerror = () => resolve()
      }),
  )
  return Promise.all(pending)
}
