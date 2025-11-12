// Video lazy loading function
function loadAndPlayVideo(button) {
  const video = button.closest('.video-s__content').querySelector('video');
  const playButton = button.closest('.video-play-button');

  if (video && video.dataset.src) {
    // Загружаем видео
    const source = video.querySelector('source');
    source.src = video.dataset.src;

    // Убираем poster и скрываем кнопку
    video.removeAttribute('poster');
    playButton.style.display = 'none';

    // Загружаем и воспроизводим
    video.load();
    video.play().catch(e => {
      console.log('Video play failed:', e);
    });

    // Показываем controls
    video.setAttribute('controls', '');
  }
}
