// دالة مساعدة: بتاخد الصورة الأصلية + إحداثيات القص من react-easy-crop
// وترجع الصورة النهائية بعد القص كـ Blob جاهز للرفع على Supabase Storage

function createImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.setAttribute('crossOrigin', 'anonymous')
    image.src = url
  })
}

export async function getCroppedImageBlob(imageSrc, croppedAreaPixels, outputWidth = 500, outputHeight = 500) {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  canvas.width = outputWidth
  canvas.height = outputHeight

  ctx.drawImage(
    image,
    croppedAreaPixels.x,
    croppedAreaPixels.y,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
    0,
    0,
    outputWidth,
    outputHeight
  )

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9)
  })
}