<?php
$faqs = json_decode(file_get_contents(__DIR__ . '/faqs.json'), true);
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>About - Moo-d Swings</title>
  <link rel="stylesheet" href="styles.css?v=moo3.5">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
</head>
<body>
  <div class="mobile-container">
    <header class="page-header">
      <span class="logo">&#x1F404; MOO-D SWINGS</span>
      <div class="header-buttons">
        <a href="index.php" class="about-link action-btn">Back</a>
      </div>
    </header>
    <main class="about-main">
      <h1 class="section-title section-title-brown">About</h1>
      <p>Moo-d Swings is a light rhythm farming game built for fun!</p>
      <section id="faqSection" class="faq-section">
        <h2 class="section-title section-title-brown">Frequently Asked Questions</h2>
        <div id="faqList">
          <?php foreach ($faqs['faqs'] as $faq): ?>
            <div class="faq-item">
              <h3><?php echo htmlspecialchars($faq['question']); ?></h3>
              <p><?php echo htmlspecialchars($faq['answer']); ?></p>
            </div>
          <?php endforeach; ?>
        </div>
      </section>
    </main>
  </div>
</body>
</html>
