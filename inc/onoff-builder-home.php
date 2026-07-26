<?php
if (!defined('_GNUBOARD_')) {
    exit;
}

$onoff_builder_home_url = G5_URL . '/plugin/icrm_member/index.php?m=home';
$onoff_builder_logout_url = G5_BBS_URL . '/logout.php';
$onoff_builder_login_target = G5_URL . '/';
$onoff_builder_site_url = G5_URL;
$onoff_builder_contact_url = '#'; // TODO: 문의 페이지가 준비되면 실제 URL로 교체
$onoff_builder_is_member = !empty($is_member);

$g5['title'] = '온오프빌더 설치형 홈 화면';

add_stylesheet('<link rel="stylesheet" href="' . G5_CSS_URL . '/onoff-builder-home.css?ver=' . G5_CSS_VER . '">', 30);
include_once(G5_PATH . '/head.sub.php');
?>

<?php
if (defined('_INDEX_') && is_file(G5_BBS_PATH . '/newwin.inc.php')) {
    include G5_BBS_PATH . '/newwin.inc.php';
}
?>

<main class="onoff-home" id="onoffHome">
    <header class="onoff-home__header">
        <a href="<?php echo G5_URL; ?>" class="onoff-home__brand" aria-label="ONOFF BUILDER">
            <span class="onoff-home__brand-mark">ON</span>
            <span>
                <strong>ONOFF BUILDER</strong>
                <em>AI 디자인을 그누보드 홈페이지로 완성</em>
            </span>
        </a>
        <nav class="onoff-home__nav" aria-label="온오프빌더 홈 메뉴">
            <a href="#onoffIntro">온오프빌더 소개</a>
            <a href="#onoffGuide">사용가이드</a>
            <a href="#onoffCustom">제작문의</a>
            <?php if ($onoff_builder_is_member) { ?>
            <a href="<?php echo $onoff_builder_logout_url; ?>">로그아웃</a>
            <?php } else { ?>
            <a href="#onoffLogin">로그인</a>
            <?php } ?>
        </nav>
    </header>

    <section class="onoff-home__hero" id="onoffIntro">
        <div class="onoff-home__hero-copy">
            <span class="onoff-home__badge">Google Studio Builder Design → GNUBoard Website</span>
            <h1>AI 디자인을 실제 운영 가능한 홈페이지로 바꾸는 온오프빌더</h1>
            <p class="onoff-home__lead">
                구글스튜디오 빌더에서 제작한 디자인 파일을 첨부하면,<br>
                해당 디자인처럼 보이는 그누보드 기반 홈페이지로 구현할 수 있습니다.
            </p>
            <p class="onoff-home__desc">
                디자인 제작은 AI로 빠르게, 운영은 그누보드 기반으로 안정적으로,
                추가 기능은 중앙 업데이트 방식으로 편리하게 관리하세요.
            </p>
            <div class="onoff-home__actions">
                <?php if ($onoff_builder_is_member) { ?>
                <a href="<?php echo $onoff_builder_home_url; ?>" class="onoff-home__btn onoff-home__btn--primary">온오프빌더 바로가기</a>
                <a href="<?php echo $onoff_builder_site_url; ?>" class="onoff-home__btn onoff-home__btn--ghost">사이트 보기</a>
                <?php } else { ?>
                <a href="#onoffLogin" class="onoff-home__btn onoff-home__btn--primary">로그인 후 이용 가능</a>
                <a href="#onoffGuide" class="onoff-home__btn onoff-home__btn--ghost">사용가이드 보기</a>
                <?php } ?>
            </div>
        </div>

        <aside class="onoff-home__access-card" id="onoffLogin" aria-label="온오프빌더 접속">
            <?php
            /*
             * 관리자 전용 분기가 필요할 때 참고:
             *
             * if ($is_admin) {
             *     // 관리자용 온오프빌더 바로가기
             * } else if ($is_member) {
             *     // 일반회원 로그인 상태 안내
             * } else {
             *     // 로그인 박스
             * }
             */
            ?>
            <?php if ($onoff_builder_is_member) { ?>
            <div class="onoff-home__access-icon">✓</div>
            <h2>온오프빌더 작업을 시작하세요</h2>
            <p>로그인이 완료되었습니다. 이제 디자인 배포, 사이트 업데이트, 추가 기능 관리를 진행할 수 있습니다.</p>
            <a href="<?php echo $onoff_builder_home_url; ?>" class="onoff-home__btn onoff-home__btn--primary onoff-home__btn--block">온오프빌더 바로가기</a>
            <div class="onoff-home__mini-actions">
                <a href="<?php echo $onoff_builder_site_url; ?>">사이트 보기</a>
                <a href="<?php echo $onoff_builder_logout_url; ?>">로그아웃</a>
            </div>
            <?php } else { ?>
            <span class="onoff-home__eyebrow">ADMIN LOGIN</span>
            <h2>관리자 로그인</h2>
            <p>온오프빌더로 설치된 홈페이지를 관리하려면 로그인하세요. 로그인 후 디자인 배포, 사이트 업데이트, 기능 관리를 시작할 수 있습니다.</p>
            <form name="flogin" class="onoff-home__login-form" action="<?php echo G5_BBS_URL; ?>/login_check.php" method="post" autocomplete="off">
                <input type="hidden" name="url" value="<?php echo $onoff_builder_login_target; ?>">
                <label>
                    <span>아이디</span>
                    <input type="text" name="mb_id" placeholder="아이디" required>
                </label>
                <label>
                    <span>비밀번호</span>
                    <input type="password" name="mb_password" placeholder="비밀번호" required>
                </label>
                <label class="onoff-home__check">
                    <input type="checkbox" name="auto_login" value="1">
                    <span>자동 로그인</span>
                </label>
                <button type="submit" class="onoff-home__btn onoff-home__btn--primary onoff-home__btn--block">로그인하기</button>
            </form>
            <?php } ?>
        </aside>
    </section>

    <section class="onoff-home__section onoff-home__features" aria-labelledby="onoffFeatureTitle">
        <div class="onoff-home__section-head">
            <span>Core Features</span>
            <h2 id="onoffFeatureTitle">온오프빌더 핵심 기능</h2>
        </div>
        <div class="onoff-home__grid onoff-home__grid--3">
            <article class="onoff-home__card">
                <b>01</b>
                <h3>구글스튜디오 빌더 디자인 적용</h3>
                <p>구글스튜디오 빌더에서 제작된 파일을 첨부하면, AI로 만든 디자인과 유사한 홈페이지 화면으로 구현할 수 있습니다.</p>
            </article>
            <article class="onoff-home__card">
                <b>02</b>
                <h3>그누보드 기반 운영</h3>
                <p>게시판, 회원관리, 관리자 기능, 상담문의 등 그누보드의 기본 기능을 활용하면서 안정적으로 홈페이지를 운영할 수 있습니다.</p>
            </article>
            <article class="onoff-home__card">
                <b>03</b>
                <h3>중앙 업데이트 지원</h3>
                <p>추가 기능과 개선사항은 중앙 업데이트 방식으로 반영되어 여러 홈페이지를 더 효율적으로 관리할 수 있습니다.</p>
            </article>
        </div>
    </section>

    <section class="onoff-home__section" id="onoffGuide" aria-labelledby="onoffGuideTitle">
        <div class="onoff-home__section-head">
            <span>Workflow</span>
            <h2 id="onoffGuideTitle">온오프빌더 제작 흐름</h2>
        </div>
        <div class="onoff-home__steps">
            <article>
                <strong>01</strong>
                <h3>구글스튜디오 빌더에서 디자인 제작</h3>
                <p>원하는 업종과 스타일에 맞춰 구글스튜디오 빌더에서 홈페이지 디자인을 제작합니다.</p>
            </article>
            <article>
                <strong>02</strong>
                <h3>제작된 디자인 파일 업로드</h3>
                <p>구글스튜디오 빌더에서 만들어진 파일을 온오프빌더에 첨부합니다.</p>
            </article>
            <article>
                <strong>03</strong>
                <h3>온오프빌더로 디자인 적용</h3>
                <p>첨부된 디자인을 기반으로 그누보드 홈페이지에 맞는 UI로 적용합니다.</p>
            </article>
            <article>
                <strong>04</strong>
                <h3>그누보드 관리자 기능으로 운영</h3>
                <p>게시판, 회원, 상담문의, 메뉴, SEO 기능 등을 관리자 화면에서 관리합니다.</p>
            </article>
            <article>
                <strong>05</strong>
                <h3>필요한 기능은 커스터마이징 의뢰</h3>
                <p>예약, 결제, AI 상담, 자동 글쓰기, 커뮤니티, 포인트 기능 등 필요한 기능은 추가 개발을 의뢰할 수 있습니다.</p>
            </article>
        </div>
    </section>

    <section class="onoff-home__section onoff-home__update" aria-labelledby="onoffUpdateTitle">
        <div>
            <span class="onoff-home__badge">Central Update</span>
            <h2 id="onoffUpdateTitle">추가 기능은 중앙 업데이트 방식으로 더 편하게 관리됩니다</h2>
            <p>
                온오프빌더는 개별 홈페이지마다 매번 수동으로 수정하지 않아도,
                공통 기능과 개선사항을 중앙 업데이트 방식으로 반영할 수 있도록 설계되었습니다.
            </p>
            <p>새로운 기능, 보안 개선, UI 개선, 기본 모듈 업데이트 등을 더 효율적으로 관리할 수 있습니다.</p>
        </div>
        <ul class="onoff-home__check-list">
            <li>공통 기능 자동 업데이트</li>
            <li>신규 모듈 추가 가능</li>
            <li>유지보수 부담 감소</li>
            <li>여러 홈페이지 일괄 관리 가능</li>
            <li>기능 개선사항 빠른 반영</li>
        </ul>
    </section>

    <section class="onoff-home__section onoff-home__custom" id="onoffCustom" aria-labelledby="onoffCustomTitle">
        <div>
            <span class="onoff-home__badge">Custom Development</span>
            <h2 id="onoffCustomTitle">필요한 기능은 언제든지 의뢰할 수 있습니다</h2>
            <p>
                온오프빌더는 기본 홈페이지 제작뿐만 아니라, 업종에 맞는 맞춤 기능 개발도 가능합니다.
                상담 챗봇, 예약 시스템, 결제 기능, 포인트 기능, 커뮤니티 기능, AI 자동 글쓰기,
                고객관리 기능 등 홈페이지 운영에 필요한 기능을 추가로 의뢰할 수 있습니다.
            </p>
        </div>
        <a href="<?php echo $onoff_builder_contact_url; ?>" class="onoff-home__btn onoff-home__btn--primary">기능 커스터마이징 문의하기</a>
    </section>

    <section class="onoff-home__cta">
        <?php if ($onoff_builder_is_member) { ?>
        <h2>이제 온오프빌더에서 디자인 배포와 사이트 업데이트를 진행할 수 있습니다.</h2>
        <a href="<?php echo $onoff_builder_home_url; ?>" class="onoff-home__btn onoff-home__btn--light">온오프빌더 바로가기</a>
        <?php } else { ?>
        <h2>온오프빌더로 홈페이지 제작을 시작하려면 먼저 로그인하세요.</h2>
        <a href="#onoffLogin" class="onoff-home__btn onoff-home__btn--light">관리자 로그인하기</a>
        <?php } ?>
    </section>
</main>

<?php
include_once(G5_PATH . '/tail.sub.php');
