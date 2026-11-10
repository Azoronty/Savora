import type { ReactNode } from "react";

/* Slide content for /pitch. Elements marked data-a animate in on each slide;
   SVG paths marked data-line draw themselves. Canvas is 1920×1080. */

function Eyebrow({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return (
    <p data-a className={`flex items-center gap-4 font-mono text-[19px] uppercase tracking-[0.16em] ${light ? "text-card/60" : "text-muted"}`}>
      <span className="h-[2px] w-10 bg-saffron" />
      {children}
    </p>
  );
}

function Frame({ children, dark = false, n }: { children: ReactNode; dark?: boolean; n: number }) {
  return (
    <div className={`relative h-full w-full px-[128px] py-[100px] ${dark ? "bg-forest text-card" : "bg-paper"}`}>
      {children}
      <div className={`pitch-foot absolute inset-x-[128px] bottom-[52px] hidden justify-between font-mono text-[15px] uppercase tracking-[0.14em] ${dark ? "text-card/45" : "text-muted"}`}>
        <span>Savora</span>
        <span>{String(n).padStart(2, "0")}</span>
      </div>
    </div>
  );
}

const Title = ({ children, className = "", light = false }: { children: ReactNode; className?: string; light?: boolean }) => (
  <h2 data-a className={`font-display text-[80px] font-light leading-[1.04] tracking-[-0.02em] ${light ? "text-card" : "text-ink"} ${className}`}>
    {children}
  </h2>
);

const Shot = ({ src, alt, className = "" }: { src: string; alt: string; className?: string }) => (
  // eslint-disable-next-line @next/next/no-img-element -- fixed-size slide canvas; Next image optimisation adds nothing here
  <img data-a src={src} alt={alt} className={`block rounded-[22px] border border-line shadow-[0_2px_4px_rgba(24,33,28,.05),0_40px_80px_-30px_rgba(24,33,28,.35)] ${className}`} />
);

export const SLIDES: ReactNode[] = [
  /* 1 · Обложка */
  <div key="cover" className="grid h-full w-full grid-cols-[1fr_1fr] bg-paper">
    <div className="flex flex-col px-[128px] py-[100px]">
      {/* eslint-disable-next-line @next/next/no-img-element -- brand wordmark */}
      <img data-a src="/brand/wordmark.webp" alt="SAVORA" className="h-[72px] w-auto self-start" />
      <div className="mt-auto">
        <Eyebrow>Управление продуктами дома</Eyebrow>
        <h1 data-a className="mt-10 font-display text-[100px] font-light leading-[1] tracking-[-0.03em] text-ink">
          Знай свою кухню.
          <br />
          <em className="font-normal italic text-forest-mid">Выбрасывай меньше.</em>
        </h1>
        <p data-a className="mt-10 max-w-[760px] text-[30px] leading-[1.5] text-ink-2">
          Приложение помнит, какие продукты есть дома, показывает, что пора использовать, и предлагает блюда из того, что уже лежит в холодильнике.
        </p>
      </div>
      <p data-a className="mt-12 font-mono text-[16px] uppercase tracking-[0.14em] text-muted">
        NOTAR Academy · Хакатон «Пищевые отходы дома» · Ноябрь 2026
      </p>
    </div>
    <div className="relative">
      <div className="absolute inset-0 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element -- slide canvas */}
        <img data-a src="/images/hero-kitchen.jpg" alt="" className="h-full w-full object-cover object-left" />
      </div>
      <div data-a className="absolute bottom-[120px] left-[-90px] w-[480px] rounded-[26px] border border-line bg-card/95 p-8 shadow-lift">
        <p className="font-mono text-[15px] uppercase tracking-[0.14em] text-muted">Использовать за 3 дня</p>
        {[
          ["Шпинат", "1 день"],
          ["Томаты черри", "2 дня"],
          ["Фета", "3 дня"],
        ].map(([name, left]) => (
          <div key={name} className="mt-5 flex items-center justify-between text-[24px]">
            <span className="font-medium">{name}</span>
            <span className="rounded-full bg-soon-soft px-4 py-1 text-[18px] font-medium text-soon">{left}</span>
          </div>
        ))}
        <div className="mt-6 rounded-2xl bg-forest px-6 py-4 text-[20px] text-card">
          Омлет со шпинатом и фетой <span className="text-card/70">· 12 минут</span>
        </div>
      </div>
    </div>
  </div>,

  /* 2 · Проблема */
  <Frame key="problem" n={2}>
    <Eyebrow>Проблема</Eyebrow>
    <div className="mt-12 grid grid-cols-[660px_1fr] gap-[110px]">
      <Title>Дома еда чаще всего пропадает из‑за того, что о ней забыли.</Title>
      <div className="grid grid-cols-2 gap-x-16 gap-y-14 pt-3">
        {[
          ["01", "С глаз долой", "Продукты в глубине холодильника вспоминают, когда уже поздно."],
          ["02", "Сроки ускользают", "Никто не держит в голове все даты, и срок проходит незаметно."],
          ["03", "Двойные покупки", "Не видя, что есть дома, легко купить вторую пачку того же."],
          ["04", "Нет плана", "Продукту нужно блюдо. Без идеи он лежит, пока не испортится."],
        ].map(([n, t, d]) => (
          <div data-a key={n} className="border-t-2 border-line-strong pt-6">
            <span className="font-mono text-[18px] text-saffron">{n}</span>
            <h3 className="mt-3 font-display text-[36px] font-normal">{t}</h3>
            <p className="mt-3 text-[25px] leading-[1.5] text-ink-2">{d}</p>
          </div>
        ))}
      </div>
    </div>
    <p data-a className="absolute bottom-[120px] left-[128px] max-w-[1100px] text-[24px] text-muted">
      В итоге деньги уходят на продукты, которые оказываются в мусорном ведре.
    </p>
  </Frame>,

  /* 2b · Масштаб: цифры из открытых исследований */
  <Frame key="research" n={3}>
    <Eyebrow>Масштаб проблемы</Eyebrow>
    <div className="mt-12 grid grid-cols-[660px_1fr] gap-[110px]">
      <Title>В 2022 году в мире выбросили 1,05 млрд тонн еды. Больше всего — дома.</Title>
      <div className="grid grid-cols-2 gap-x-16 gap-y-14 pt-3">
        {[
          ["60%", "пищевых отходов приходится на домохозяйства: 631 млн т. Это больше, чем у ресторанов и магазинов вместе.", "UNEP, 2024"],
          ["79 кг", "еды в год выбрасывает дома один человек. Между странами с высоким и средним доходом разница всего 7 кг.", "UNEP, 2024"],
          ["73%", "выброшенного дома ещё можно было съесть: 4,4 из 6 млн т. Это около £1 000 в год на семью из четырёх.", "WRAP, Великобритания, 2022"],
          ["до 10%", "пищевых отходов ЕС связаны с датами на упаковке: люди путают «употребить до» и «лучше до».", "Еврокомиссия, 2018"],
        ].map(([n, d, s]) => (
          <div data-a key={n} className="border-t-2 border-line-strong pt-6">
            <span className="font-display text-[64px] font-light leading-none text-forest">{n}</span>
            <p className="mt-4 text-[24px] leading-[1.45] text-ink-2">{d}</p>
            <p className="mt-3 font-mono text-[15px] uppercase tracking-[0.12em] text-saffron">{s}</p>
          </div>
        ))}
      </div>
    </div>
    <p data-a className="absolute bottom-[110px] left-[128px] max-w-[1660px] font-mono text-[15px] leading-[1.6] text-muted">
      Источники: UNEP, Food Waste Index Report 2024 · WRAP, Household Food and Drink Waste in the UK, 2025 · European Commission, Market study on date marking, 2018
    </p>
  </Frame>,

  /* 3 · Аудитория */
  <Frame key="audience" n={4}>
    <Eyebrow>Для кого</Eyebrow>
    <Title className="mt-10 max-w-[1400px]">Для тех, кто покупает продукты на всю семью и готовит дома.</Title>
    <div className="mt-20 grid grid-cols-3 gap-8">
      {[
        ["Семьи", "Из одного холодильника едят несколько человек. Никто не видит полной картины: что есть и что уже открыто."],
        ["Пары и соседи", "Продукты покупают двое и больше, поэтому дубли и забытые упаковки — обычное дело."],
        ["Закупка раз в неделю", "Большая закупка значит, что свежие продукты нужно съесть в правильном порядке. Уследить за этим трудно."],
      ].map(([t, d]) => (
        <div data-a key={t} className="rounded-[26px] border border-line bg-card p-10">
          <h3 className="font-display text-[38px] font-normal">{t}</h3>
          <p className="mt-4 text-[24px] leading-[1.5] text-ink-2">{d}</p>
        </div>
      ))}
    </div>
    <p data-a className="mt-14 max-w-[1300px] text-[26px] leading-[1.5] text-ink-2">
      Их объединяет одно: хочется меньше тратить на продукты, которые никто не съел, и не вести сложный учёт.
    </p>
  </Frame>,

  /* 4 · Решение */
  <Frame key="solution" n={5} dark>
    <Eyebrow light>Решение</Eyebrow>
    <Title light className="mt-10 max-w-[1450px]">
      Один список продуктов для всей кухни и три привычки вокруг него.
    </Title>
    <div className="mt-24 grid grid-cols-3 gap-[2px] overflow-hidden rounded-[26px] bg-card/10">
      {[
        ["01", "Знать, что есть", "Холодильник, морозилка и шкаф в одном списке. Добавить продукт можно за пару секунд: детали Savora подставит сама."],
        ["02", "Успевать использовать", "Понятные статусы срока, календарь на неделю и блюда, где первыми идут продукты с ближайшей датой."],
        ["03", "Покупать только нужное", "Список покупок не даёт добавить дубль и подсказывает, если продукт уже есть дома."],
      ].map(([n, t, d]) => (
        <div data-a key={n} className="bg-forest p-12">
          <span className="font-mono text-[18px] text-saffron">{n}</span>
          <h3 className="mt-8 font-display text-[38px] font-normal text-card">{t}</h3>
          <p className="mt-4 text-[24px] leading-[1.5] text-card/75">{d}</p>
        </div>
      ))}
    </div>
    <p data-a className="mt-14 max-w-[1300px] text-[25px] leading-[1.5] text-card/75">
      Если продукт всё же выброшен, журнал отходов сохранит причину. Со временем видно, откуда берутся потери.
    </p>
  </Frame>,

  /* 5 · Возможности */
  <Frame key="features" n={6}>
    <Eyebrow>Возможности</Eyebrow>
    <Title className="mt-10">Пять инструментов на одних данных.</Title>
    <div className="mt-16 grid grid-cols-5 gap-6">
      {[
        ["Инвентарь", "Быстрый ввод", "Пишете «шпинат» — категория, место хранения, единица и типичный срок заполняются сами. Поиск, фильтры, сортировка."],
        ["Сроки", "Понятные статусы", "«Свежее», «Использовать скоро» (до 3 дней) и «Срок прошёл». Календарь на неделю и отдельная страница."],
        ["Блюда", "С объяснением", "24 рецепта в порядке срочности. У каждого видно, что есть, чего не хватает и почему он предложен."],
        ["Покупки", "Без дублей", "Добавляет недостающее из рецепта, предупреждает о запасах дома и переносит купленное в инвентарь."],
        ["Журнал", "Честные цифры", "Количество, причина, дата и стоимость, если известна цена. Графики строятся только по записям."],
      ].map(([k, t, d]) => (
        <div data-a key={k} className="flex flex-col rounded-[24px] border border-line bg-card p-8">
          <span className="font-mono text-[17px] text-saffron">{k}</span>
          <h3 className="mt-5 font-display text-[32px] font-normal leading-tight">{t}</h3>
          <p className="mt-4 text-[21px] leading-[1.5] text-ink-2">{d}</p>
        </div>
      ))}
    </div>
    <div data-a className="mt-10 flex gap-4">
      {[
        ["bg-fresh-soft text-fresh", "bg-fresh", "Свежее"],
        ["bg-soon-soft text-soon", "bg-saffron", "Использовать скоро"],
        ["bg-expired-soft text-expired", "bg-expired", "Срок прошёл"],
      ].map(([c, d, t]) => (
        <span key={t} className={`inline-flex h-11 items-center gap-3 rounded-full px-5 text-[20px] font-medium ${c}`}>
          <span className={`size-2.5 rounded-full ${d}`} />
          {t}
        </span>
      ))}
    </div>
  </Frame>,

  /* 6b · Отличие: план спасения, напоминания, ввод одной фразой */
  <Frame key="unique" n={7}>
    <Eyebrow>Чем Savora отличается</Eyebrow>
    <div className="mt-10 grid grid-cols-[1fr_760px] gap-[80px]">
      <div>
        <Title className="!text-[60px]">Не напоминает о сроках, а&nbsp;составляет план, как всё успеть съесть.</Title>
        <div className="mt-10 flex flex-col gap-7">
          {[
            ["01", "План спасения на неделю", "Расписание блюд по дедлайнам: продукт, у которого меньше всего времени, планируется первым. На демо-кухне план успевает использовать 25 из 27 продуктов, которые иначе дойдут до срока, а для двух остальных подсказывает: заморозить или съесть."],
            ["02", "Утреннее push-уведомление", "Каждый час база сама будит сервер (pg_cron), и в выбранный час человек получает: что истекает к завтра и что приготовить сегодня. Даже если сайт закрыт. Каждая отправка записывается."],
            ["03", "Ввод одной фразой", "Голосом или текстом: «молоко 2 л, яйца 10, шпинат». Savora сама разбивает на продукты, ставит количество и срок. Плюс «обычные покупки» в одно касание."],
          ].map(([n, t, d]) => (
            <div data-a key={n} className="grid grid-cols-[56px_1fr] gap-4">
              <span className="font-mono text-[20px] text-saffron">{n}</span>
              <div>
                <h3 className="font-display text-[34px] font-normal leading-tight">{t}</h3>
                <p className="mt-2 text-[21px] leading-[1.45] text-ink-2">{d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Shot src="/pitch/plan.jpg" alt="Страница плана спасения: 7 продуктов, 7 используются вовремя" className="w-full self-center" />
    </div>
  </Frame>,

  /* 6 · Демо: главный экран */
  <Frame key="demo-dashboard" n={8}>
    <div className="grid h-full grid-cols-[480px_1fr] gap-[72px]">
      <div className="pt-2">
        <Eyebrow>Продукт</Eyebrow>
        <Title className="mt-8 text-[54px]">Главный экран отвечает на вопрос: что пора использовать?</Title>
        <p data-a className="mt-8 text-[24px] leading-[1.5] text-ink-2">
          Заголовок, четыре показателя и календарь на неделю считаются по данным семьи. Ниже — блюда и подсказки из того же инвентаря.
        </p>
        <p data-a className="mt-6 text-[19px] text-muted">Скриншот работающего приложения, демо-кухня.</p>
      </div>
      <Shot src="/pitch/dashboard.jpg" alt="Главный экран Savora" className="w-full self-start" />
    </div>
  </Frame>,

  /* 7 · Демо: сценарии */
  <Frame key="demo-flows" n={9}>
    <Eyebrow>Продукт</Eyebrow>
    <Title className="mt-8 text-[60px]">Добавить за секунды. Приготовить то, что истекает.</Title>
    <div className="mt-12 grid grid-cols-[1fr_1fr_250px] items-start gap-10">
      <div>
        <Shot src="/pitch/add-product.jpg" alt="Добавление продукта с автозаполнением" className="w-full" />
        <p data-a className="mt-5 text-[21px] text-ink-2">Каталог из ~90 продуктов подставляет детали.</p>
      </div>
      <div>
        <Shot src="/pitch/recipe.jpg" alt="Рецепт с объяснением" className="w-full" />
        <p data-a className="mt-5 text-[21px] text-ink-2">Рецепт показывает, что есть, чего нет и почему он здесь.</p>
      </div>
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element -- slide canvas */}
        <img data-a src="/pitch/mobile-inventory.jpg" alt="Инвентарь на телефоне" className="block w-full rounded-[38px] border-[10px] border-forest-deep shadow-lift" />
        <p data-a className="mt-5 text-[21px] text-ink-2">Адаптивный дизайн с нижней навигацией.</p>
      </div>
    </div>
  </Frame>,

  /* 8 · Как работают рекомендации */
  <Frame key="engine" n={10}>
    <Eyebrow>Рекомендации</Eyebrow>
    <Title className="mt-8 max-w-[1500px] text-[68px]">Рекомендации строятся по правилам, которые можно прочитать.</Title>
    <div className="mt-14 grid grid-cols-[1.15fr_1fr] gap-12">
      <div data-a className="rounded-[26px] border border-line bg-card p-10">
        <p className="font-mono text-[17px] uppercase tracking-[0.14em] text-muted">Оценка рецепта</p>
        <p className="mt-6 font-display text-[44px] font-light leading-[1.25]">
          <span className="text-soon">срочность</span> + 6 × <span className="text-forest-mid">доля ингредиентов</span> − 2 × <span className="text-expired">недостающие</span>
        </p>
        <div className="mt-8 grid grid-cols-4 gap-3 text-center">
          {[
            ["≤ 1 дня", "4"],
            ["≤ 3 дней", "3"],
            ["≤ 7 дней", "1,5"],
            ["позже", "0,5"],
          ].map(([d, p]) => (
            <div key={d} className="rounded-2xl bg-paper-deep/70 px-3 py-4">
              <p className="font-display text-[38px] leading-none">{p}</p>
              <p className="mt-2 text-[18px] text-muted">{d}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-[21px] leading-[1.5] text-ink-2">Продукты с прошедшим сроком не используются. Масло, соль, перец и вода считаются базовыми.</p>
      </div>
      <div data-a className="rounded-[26px] bg-forest p-10 text-card">
        <p className="font-mono text-[17px] uppercase tracking-[0.14em] text-card/60">Пример объяснения</p>
        <h3 className="mt-6 font-display text-[40px] font-normal text-card">Омлет со шпинатом и фетой</h3>
        <ul className="mt-6 flex flex-col gap-4 text-[24px]">
          <li className="flex gap-3"><span className="mt-3 size-2.5 shrink-0 rounded-full bg-saffron" />Использует шпинат (1 день) и фету (3 дня)</li>
          <li className="flex gap-3"><span className="mt-3 size-2.5 shrink-0 rounded-full bg-card/80" />Все основные ингредиенты есть</li>
          <li className="flex gap-3"><span className="mt-3 size-2.5 shrink-0 rounded-full border border-card/50" />Зелёный лук — по желанию</li>
        </ul>
        <div className="mt-8 flex gap-2">
          <span className="h-3 w-12 rounded-full bg-card/85" />
          <span className="h-3 w-12 rounded-full bg-saffron" />
          <span className="h-3 w-12 rounded-full bg-saffron" />
        </div>
        <p className="mt-4 text-[19px] text-card/65">Полоски: есть · скоро истекает · нет в наличии</p>
      </div>
    </div>
  </Frame>,

  /* · Savi, 1 of 2: who Savi is */
  <Frame key="savi" n={11}>
    <div className="grid h-full grid-cols-[1fr_760px] items-center gap-[80px]">
      <div>
        <Eyebrow>Savi · часть SAVORA</Eyebrow>
        <Title className="mt-8 text-[72px]">Знакомьтесь: Savi.</Title>
        <p data-a className="mt-8 max-w-[720px] text-[26px] leading-[1.5] text-ink-2">
          Маленький компаньон из еды. Он живёт прямо в интерфейсе и помогает не забывать о продуктах.
        </p>
        <ul className="mt-12 grid grid-cols-2 gap-4">
          {[
            ["Живёт в интерфейсе", "Гуляет по боковой панели или нижнему меню, проводит экскурсию по приложению и подбегает к продуктам, которые пора съесть."],
            ["Реагирует на дело", "Радуется спасённому продукту и приготовленному блюду."],
            ["Говорит по делу", "Короткие подсказки со ссылкой на нужный экран, по одной за раз."],
            ["Не мешает", "Тихий режим, скрытие и уважение к reduced motion."],
          ].map(([t, d]) => (
            <li data-a key={t} className="rounded-2xl border border-line bg-card p-6">
              <p className="font-display text-[28px] leading-tight">{t}</p>
              <p className="mt-2 text-[19px] leading-[1.45] text-ink-2">{d}</p>
            </li>
          ))}
        </ul>
      </div>
      <div data-a className="flex h-full items-center justify-center rounded-[36px] bg-[radial-gradient(ellipse_at_50%_60%,#f3e3c3,transparent_68%)]">
        {/* eslint-disable-next-line @next/next/no-img-element -- slide canvas */}
        <img src="/pitch/savi-hero.webp" alt="Savi радуется" className="h-[560px] w-auto drop-shadow-[0_30px_40px_rgba(20,42,30,0.28)]" />
      </div>
    </div>
  </Frame>,

  /* · Savi, 2 of 2: how Savi grows */
  <Frame key="savi-growth" n={12}>
    <Eyebrow>Savi растёт</Eyebrow>
    <Title className="mt-8 text-[64px]">Чем больше еды вы спасаете, тем сильнее Savi.</Title>
    <div data-a className="mt-10 flex items-end justify-between rounded-[32px] bg-[radial-gradient(ellipse_at_50%_100%,#f3e3c3,transparent_70%)] px-10 pb-6 pt-8">
      {["Seed", "Sprout", "Bud", "Harvest", "Chef", "Food Mage", "Food Guardian"].map((name, i) => (
        <div key={name} className="flex flex-col items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- slide canvas */}
          <img src={`/pitch/savi-${i + 1}.webp`} alt={`Savi, стадия ${i + 1}: ${name}`} style={{ height: 140 + i * 28 }} className="w-auto drop-shadow-[0_18px_22px_rgba(20,42,30,0.22)]" />
          <span className="text-center">
            <span className="block font-mono text-[15px] text-saffron">0{i + 1}</span>
            <span className="text-[18px] font-medium">{name}</span>
          </span>
        </div>
      ))}
    </div>
    <div className="mt-6 grid grid-cols-4 gap-4">
      {[
        ["+15 XP", "продукт, использованный в последние 3 дня срока"],
        ["+20 XP", "блюдо, приготовленное по рецепту"],
        ["3 миссии", "каждый день, за них бонусный XP"],
        ["Честный счёт", "XP начисляет база данных, с дневными лимитами"],
      ].map(([v, l]) => (
        <div data-a key={v} className="rounded-2xl border border-line bg-card p-5">
          <p className="font-display text-[32px] leading-none text-forest-mid">{v}</p>
          <p className="mt-2 text-[18px] leading-snug text-muted">{l}</p>
        </div>
      ))}
    </div>
  </Frame>,

  /* 9 · Архитектура */
  <Frame key="architecture" n={13}>
    <Eyebrow>Архитектура</Eyebrow>
    <Title className="mt-8 text-[68px]">Настоящий бэкенд. Защита — на уровне базы данных.</Title>
    <div className="relative mt-16 grid grid-cols-[1fr_1.5fr_1fr] items-stretch gap-[72px]">
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1664 330" preserveAspectRatio="none" aria-hidden="true">
        <path data-line d="M 400 165 L 470 165" stroke="#c98a2b" strokeWidth="3" strokeDasharray="400" fill="none" />
        <path data-line d="M 1194 165 L 1264 165" stroke="#c98a2b" strokeWidth="3" strokeDasharray="400" fill="none" />
      </svg>
      <div data-a className="rounded-[26px] border border-line bg-card p-9">
        <span className="font-mono text-[17px] text-saffron">Браузер</span>
        <h3 className="mt-4 font-display text-[34px] font-normal">React-клиент</h3>
        <p className="mt-4 text-[21px] leading-[1.5] text-ink-2">Формы, шторки, фильтры. Фильтры живут в URL. Нативный &lt;dialog&gt; для доступных модальных окон.</p>
      </div>
      <div data-a className="rounded-[26px] bg-forest p-9 text-card">
        <span className="font-mono text-[17px] text-saffron">Next.js 16 на Vercel</span>
        <div className="mt-5 grid grid-cols-2 gap-3">
          {[
            ["proxy.ts", "Обновление сессии, защита маршрутов"],
            ["Server Components", "Чтение через слой данных"],
            ["Server Actions", "Валидация Zod, типизированные ответы"],
            ["Доменная логика", "Сроки, ранжирование, статистика"],
          ].map(([t, d]) => (
            <div key={t} className="rounded-2xl bg-card/[0.08] p-5">
              <p className="font-display text-[26px] text-card">{t}</p>
              <p className="mt-1 text-[18px] text-card/70">{d}</p>
            </div>
          ))}
        </div>
      </div>
      <div data-a className="rounded-[26px] border border-line bg-card p-9">
        <span className="font-mono text-[17px] text-saffron">Supabase</span>
        <h3 className="mt-4 font-display text-[34px] font-normal">Postgres + Auth</h3>
        <p className="mt-4 text-[21px] leading-[1.5] text-ink-2">Row Level Security на каждой таблице. Атомарные функции: списать, выбросить, разложить покупки.</p>
      </div>
    </div>
    <div className="mt-14 grid grid-cols-4 gap-8">
      {[
        ["JWT пользователя", "Только публичный ключ. Сервисного ключа в приложении нет."],
        ["Ограничения и индексы", "Enum, CHECK, тип date, уникальный индекс против дублей."],
        ["Даты без сдвигов", "Расчёт целыми днями в часовом поясе пользователя."],
        ["Тесты", "53 unit-теста и сквозной сценарий Playwright из 16 шагов."],
      ].map(([t, d]) => (
        <div data-a key={t} className="border-t-2 border-line-strong pt-5">
          <h3 className="font-display text-[27px] font-normal">{t}</h3>
          <p className="mt-2 text-[20px] leading-[1.45] text-ink-2">{d}</p>
        </div>
      ))}
    </div>
  </Frame>,

  /* 10 · Ценность */
  <Frame key="value" n={14}>
    <Eyebrow>Ценность</Eyebrow>
    <Title className="mt-8 max-w-[1500px]">На каждую причину потерь — своя функция.</Title>
    <div className="mt-14 border-t-2 border-ink">
      {[
        ["Забытые продукты", "Один список для холодильника, морозилки и шкафа, отсортированный по дате, и календарь на неделю."],
        ["Пропущенные сроки", "Статусы и счётчики, отдельная страница и подсказки вроде «приготовьте или заморозьте курицу»."],
        ["Двойные покупки", "Список покупок блокирует повторы и прямо при вводе показывает, что уже есть дома."],
        ["Нет плана на ужин", "Рецепты по срочности; недостающее добавляется в покупки одним нажатием."],
        ["Непонятно, где потери", "Журнал с причинами, категориями, динамикой и стоимостью — только по реальным записям."],
      ].map(([t, d]) => (
        <div data-a key={t} className="grid grid-cols-[460px_1fr] items-baseline border-b border-line-strong py-7">
          <h3 className="font-display text-[34px] font-normal">{t}</h3>
          <p className="text-[25px] leading-[1.45] text-ink-2">{d}</p>
        </div>
      ))}
    </div>
  </Frame>,

  /* 11 · Честность */
  <Frame key="honesty" n={15}>
    <Eyebrow>Принципы</Eyebrow>
    <div className="mt-12 grid grid-cols-[1fr_1fr] gap-[100px]">
      <Title>Savora следит за датами. Последнее слово — за вами.</Title>
      <div className="flex flex-col gap-9 pt-4">
        {[
          "Даты — те, что вы ввели. Подсказанный срок нужен для быстрого ввода, и приложение всегда просит сверить его с упаковкой.",
          "«Срок прошёл» значит, что наступила введённая дата. Это повод проверить продукт, а не вердикт о его безопасности.",
          "Деньги считаются, только если указана цена. Ничего не оценивается и не придумывается.",
          "Демо-данные помечены «Sample» и удаляются одной кнопкой. Они не смешиваются с настоящими записями.",
        ].map((t) => (
          <p data-a key={t} className="flex gap-5 text-[26px] leading-[1.5] text-ink-2">
            <span className="mt-[14px] h-[2px] w-8 shrink-0 bg-saffron" />
            {t}
          </p>
        ))}
      </div>
    </div>
  </Frame>,

  /* 12 · Итог */
  <Frame key="closing" n={16} dark>
    <div className="flex h-full flex-col justify-center">
      {/* eslint-disable-next-line @next/next/no-img-element -- brand wordmark */}
      <img data-a src="/brand/wordmark-light.webp" alt="SAVORA" className="h-[72px] w-auto self-start" />
      <h2 data-a className="mt-14 max-w-[1550px] font-display text-[104px] font-light leading-[1.02] tracking-[-0.02em] text-card">
        Проще всего спасти ту еду, которая уже есть дома.
      </h2>
      <p data-a className="mt-12 max-w-[1150px] text-[28px] leading-[1.5] text-card/75">
        Savora — работающий продукт: настоящая база данных с защитой на уровне строк, понятный алгоритм рекомендаций и интерфейс для каждого дня на любом экране.
      </p>
      <div data-a className="mt-16 flex gap-16 font-mono text-[22px] tracking-[0.04em] text-card/90">
        <span>savora-mauve.vercel.app</span>
        <span>github.com/Azoronty/Savora</span>
      </div>
    </div>
  </Frame>,
];
