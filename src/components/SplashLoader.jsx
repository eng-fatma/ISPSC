import "../styles/splash.css";

export default function SplashLoader() {
  return (
    <div id="initial-loader">

      <div className="loader-bg">
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        <span></span>
      </div>

      <div className="circuit"></div>

      <div className="loader-center">

        <div className="logo-ring"></div>

        <div className="logo-card">
          <img
            src="/logo.png"
            alt="ISPSC"
            className="logo-image"
          />

          <div className="logo-shine"></div>
        </div>

        <h2 className="loader-title">
          ISPSC
        </h2>

        <p className="loader-subtitle">
          Intelligent System for Predicting Suitable Crops
        </p>

        <div className="loader-progress">

          <div className="loader-bar">
            <div className="loader-fill"></div>
          </div>

          <div className="loader-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>

        </div>

      </div>

    </div>
  );
}