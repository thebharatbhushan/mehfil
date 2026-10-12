import { isValidYouTubeId } from '@/lib/youtube';

interface YouTubePoemPlayerProps {
  /** Validated 11-character YouTube video ID (poem.youtubeVideoId). */
  videoId?: string | null;
  poemTitle?: string;
}

/**
 * "Listen in the poet's own voice" section shown at the end of a poem.
 * Renders nothing when there is no (valid) video, so old poems look exactly as before.
 * The iframe src is built only from the validated ID; the iframe is lazy-loaded and uses the
 * privacy-enhanced youtube-nocookie.com domain.
 */
export function YouTubePoemPlayer({ videoId, poemTitle }: YouTubePoemPlayerProps) {
  if (!isValidYouTubeId(videoId)) return null;
  const title = poemTitle ? `${poemTitle} — लेखक की आवाज़ में` : 'लेखक की आवाज़ में कविता';
  return (
    <section className="yt-poem" aria-labelledby="yt-poem-heading">
      <h2 id="yt-poem-heading" className="yt-poem-title">
        <i className="fas fa-microphone-alt" aria-hidden="true" /> लेखक की आवाज़ में सुनें
      </h2>
      <p className="yt-poem-sub">इस रचना को लेखक की अपनी आवाज़ में सुनिए</p>
      <div className="yt-poem-frame">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0`}
          title={title}
          loading="lazy"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
      <a className="yt-poem-link" href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noopener noreferrer">
        <i className="fab fa-youtube" aria-hidden="true" /> YouTube पर देखें
      </a>
    </section>
  );
}
