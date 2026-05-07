<svelte:head>
  <title>{disguised ? 'Home - Classroom' : '𝚞𝚗𝚋𝚕𝚘𝚌𝚔𝚎𝚍 𝚐𝚊𝚖𝚎𝚜'}</title>
  <link rel="icon" href={disguised ? '/favicon-classroom.png' : '/favicon-unblocked.png'} type="image/png" />
  <script src="https://unpkg.com/@ruffle-rs/ruffle"></script>
</svelte:head>

<script>
  // ─── Catppuccin Macchiato Palette ───────────────────────────────────────────
  const COLORS = {
    base:      '#24273a',
    mantle:    '#1e2030',
    crust:     '#181926',
    surface0:  '#363a4f',
    surface1:  '#494d64',
    surface2:  '#5b6078',
    overlay0:  '#6e738d',
    overlay1:  '#8087a2',
    overlay2:  '#939ab7',
    subtext0:  '#a5adcb',
    subtext1:  '#b8c0e0',
    text:      '#cad3f5',
    lavender:  '#b7bdf8',
    blue:      '#8aadf4',
    sapphire:  '#7dc4e4',
    sky:       '#91d7e3',
    teal:      '#8bd5ca',
    green:     '#a6da95',
    yellow:    '#eed49f',
    peach:     '#f5a97f',
    maroon:    '#ee99a0',
    red:       '#ed8796',
    mauve:     '#c6a0f6',
    pink:      '#f5bde6',
    flamingo:  '#f0c6c6',
    rosewater: '#f4dbd6',
  };

  // ─── Games Array ─────────────────────────────────────────────────────────────
  const games = [
    { id: '1on1soccer',             name: '1 on 1 Soccer' },
    { id: '1v1lol',                 name: '1v1.lol' },
    { id: '2048',                   name: '2048' },
    { id: '2drocketleague',         name: '2D Rocket League' },
    { id: '404simumator',           name: '404 Simulator' },
    { id: '60sburgerrun',           name: '60s Burger Run' },
    { id: 'adarkroom',              name: 'A Dark Room' },
    { id: 'adofai',                 name: 'A Dance of Fire & Ice' },
    { id: 'achieveunlocked',        name: 'Achievement Unlocked' },
    { id: 'achieveunlocked2',       name: 'Achievement Unlocked 2' },
    { id: 'adventure-capitalist',   name: 'Adventure Capitalist' },
    { id: 'ageofwar',               name: 'Age of War' },
    { id: 'amazing-rope-police',    name: 'Amazing Rope Police' },
    { id: 'amongus',                name: 'Among Us' },
    { id: 'avalanche',              name: 'Avalanche' },
    { id: 'awesometanks',           name: 'Awesome Tanks' },
    { id: 'badicecream',            name: 'Bad Ice Cream' },
    { id: 'badicecream2',           name: 'Bad Ice Cream 2' },
    { id: 'badicecream3',           name: 'Bad Ice Cream 3' },
    { id: 'badpiggies',             name: 'Bad Piggies' },
    { id: 'badtimesimulator',       name: 'Bad Time Simulator' },
    { id: 'baldis-basics',          name: "Baldi's Basics" },
    { id: 'basketball-stars',       name: 'Basketball Stars' },
    { id: 'basketbros',             name: 'Basket Bros' },
    { id: 'basketrandom',           name: 'Basket Random' },
    { id: 'bitlife',                name: 'Bitlife' },
    { id: 'bit-planes',             name: 'Bit Planes' },
    { id: 'bloodtournament',        name: 'Blood Tournament' },
    { id: 'btd',                    name: 'Bloons Tower Defense' },
    { id: 'btd2',                   name: 'Bloons Tower Defense 2' },
    { id: 'btd3',                   name: 'Bloons Tower Defense 3' },
    { id: 'btd4',                   name: 'Bloons Tower Defense 4' },
    { id: 'btd5',                   name: 'Bloons Tower Defense 5' },
    { id: 'btd6',                   name: 'Bloons Tower Defense 6' },
    { id: 'bobtherobber2',          name: 'Bob the Robber 2' },
    { id: 'boxingphysics2',         name: 'Boxing Physics 2' },
    { id: 'boxingrandom',           name: 'Boxing Random' },
    { id: 'bubbleshooter',          name: 'Bubble Shooter' },
    { id: 'burgerandfrights',       name: 'Burger and Frights' },
    { id: 'burritobison',           name: 'Burrito Bison' },
    { id: 'cell-machine',           name: 'Cell Machine' },
    { id: 'celeste',                name: 'Celeste' },
    { id: 'championisland',         name: 'Champion Island' },
    { id: 'chess',                  name: 'Chess' },
    { id: 'chibiknight',            name: 'Chibi Knight' },
    { id: 'circloo',                name: 'CircloO' },
    { id: 'clickerheroes',          name: 'Clicker Heroes' },
    { id: 'cluster-rush',           name: 'Cluster Rush' },
    { id: 'cmm-client',             name: 'CMM Client' },
    { id: 'colorswitch',            name: 'Color Switch' },
    { id: 'commodoreclicker',       name: 'Commodore 64 Clicker' },
    { id: 'cookieclicker',          name: 'Cookie Clicker' },
    { id: 'crossyroad',             name: 'Crossy Road' },
    { id: 'csgoclicker',            name: 'CSGO Case Clicker' },
    { id: 'cubefield',              name: 'Cubefield' },
    { id: 'cuttherope',             name: 'Cut The Rope' },
    { id: 'cuttherope-holiday',     name: 'Cut The Rope Holday' },
    { id: 'dadish',                 name: 'Dadish' },
    { id: 'dadish2',                name: 'Dadish 2' },
    { id: 'dadish3',                name: 'Dadish 3' },
    { id: 'dante',                  name: 'Dante' },
    { id: 'deal',                   name: 'Deal or No Deal' },
    { id: 'death-run-3d',           name: 'Death Run 3D' },
    { id: 'dino',                   name: 'Dino' },
    { id: 'dogeminer',              name: 'Doge Miner' },
    { id: 'doodlejump',             name: 'Doodle Jump' },
    { id: 'doom',                   name: 'DOOM' },
    { id: 'drag',                   name: 'Dragon Client' },
    { id: 'dragonballdevolution',   name: 'Dragon Ball Devolution' },
    { id: 'drift-boss',             name: 'Drift Boss' },
    { id: 'drifthunters',           name: 'Drift Hunters' },
    { id: 'drivemad',               name: 'Drive Mad' },
    { id: 'ducklife1',              name: 'Duck Life 1' },
    { id: 'ducklife2',              name: 'Duck Life 2' },
    { id: 'ducklife3',              name: 'Duck Life 3' },
    { id: 'ducklife4',              name: 'Duck Life 4' },
    { id: 'ducklife5',              name: 'Duck Life 5' },
    { id: 'ducklife6',              name: 'Duck Life 6' },
    { id: 'emulatorjs',             name: 'emulatorJS' },
    { id: 'factoryballs',           name: 'Factory Balls' },
    { id: 'factoryballsforever',    name: 'Factory Balls Forever' },
    { id: 'fancypantsadventures',   name: 'Fancy Pants Adventures' },
    { id: 'fancypantsadventures2',  name: 'Fancy Pants Adventures 2' },
    { id: 'fireboywatergirl',       name: 'Fireboy & Watergirl 1' },
    { id: 'fireboywatergirl2',      name: 'Fireboy & Watergirl 2' },
    { id: 'fireboywatergirl3',      name: 'Fireboy & Watergirl 3' },
    { id: 'fireboywatergirl4',      name: 'Fireboy & Watergirl 4' },
    { id: 'flappybird',             name: 'Flappy Bird' },
    { id: 'flappyplane',            name: 'Flappy Plane' },
    { id: 'flippyfish',             name: 'Flippy Fish' },
    { id: 'fluidsim',               name: 'WebGL Fluid Sim' },
    { id: 'fnaf',                   name: "Five Nights at Freddy's" },
    { id: 'fnaf2',                  name: "Five Nights at Freddy's 2" },
    { id: 'fnaf3',                  name: "Five Nights at Freddy's 3" },
    { id: 'fnaf4',                  name: "Five Nights at Freddy's 4" },
    { id: 'fridaynightfunkin',      name: 'Friday Night Funkin' },
    { id: 'fruitninja',             name: 'Fruit Ninja' },
    { id: 'funnyballgame',          name: 'Funny Ball Game' },
    { id: 'funnymadracing',         name: 'Funny Mad Racing' },
    { id: 'funnyshooter',           name: 'Funny Shooter' },
    { id: 'funnyshooter2',          name: 'Funny Shooter 2' },
    { id: 'gamemaker',              name: 'Game Maker Doodle' },
    { id: 'gba',                    name: 'GBA Emulator' },
    { id: 'geometrydash',           name: 'Geometry Dash' },
    { id: 'geometryrash',           name: 'Geometry Rash' },
    { id: 'getawayshooter',         name: 'Getaway Shooter' },
    { id: 'golddiggerfrvr',         name: 'Gold Digger FRVR' },
    { id: 'guiltygear',             name: 'Guilty Gear' },
    { id: 'gunmayhem',              name: 'Gun Mayhem' },
    { id: 'gunmayhem2',             name: 'Gun Mayhem 2' },
    { id: 'gunmayhemredux',         name: 'Gun Mayhem Redux' },
    { id: 'halloween2016',          name: 'Halloween 2016' },
    { id: 'happywheels',            name: 'Happy Wheels' },
    { id: 'helixjump',              name: 'Helix Jump' },
    { id: 'breakingthebank',        name: 'Henry Stickmin - Breaking the Bank' },
    { id: 'escapingtheprison',      name: 'Henry Stickmin - Escaping the Prison' },
    { id: 'fleeingthecomplex',      name: 'Henry Stickmin - Fleeing the Complex' },
    { id: 'infiltratingtheairship', name: 'Henry Stickmin - Infiltrating the Airship' },
    { id: 'stealingthediamond',     name: 'Henry Stickmin - Stealing the Diamond' },
    { id: 'hexgl',                  name: 'HexGL' },
    { id: 'hextris',                name: 'Hextris' },
    { id: 'hillclimbracing2',       name: 'Hill Climb Racing 2' },
    { id: 'holeio',                 name: 'hole.io' },
    { id: 'iwbtc',                  name: 'I Wanna Be Thy Copy' },
    { id: 'idlebreakout',           name: 'Idle Breakout' },
    { id: 'jetpackjoyride',         name: 'Jetpack Joyride' },
    { id: 'justfalllol',            name: 'justfall.lol' },
    { id: 'knifehit',               name: 'Knife Hit' },
    { id: 'lasthorizon',            name: 'Last Horizon' },
    { id: 'lazyjump3d',             name: 'Lazy Jump 3D' },
    { id: 'learntofly',             name: 'Learn to Fly' },
    { id: 'learntofly2',            name: 'Learn to Fly 2' },
    { id: 'learntoflyidle',         name: 'Learn to Fly Idle' },
    { id: 'ocarinaoftime',          name: 'Legend of Zelda - Ocarina of Time' },
    { id: 'linerider',              name: 'Line Rider' },
    { id: 'littlealchemy',          name: 'Little Alchemy' },
    { id: 'lowsadventures2',        name: 'Lows Adventures 2' },
    { id: 'madalincars',            name: 'Madalin Cars' },
    { id: 'mario',                  name: 'Mario' },
    { id: 'metroidzeromission',     name: 'Metroid: Zero Mission' },
    { id: 'minesweeper',            name: 'Minesweeper' },
    { id: 'monkeymart',             name: 'Monkey Mart' },
    { id: 'monstertracks',          name: 'Monster Tracks' },
    { id: 'motox3m',                name: 'Moto X3M' },
    { id: 'motox3m-pool',           name: 'Moto X3M Pool Party' },
    { id: 'motox3m-spooky',         name: 'Moto X3M Spooky' },
    { id: 'motox3m-winter',         name: 'Moto X3M Winter' },
    { id: 'ngon',                   name: 'n-gon' },
    { id: 'nutsim',                 name: 'Nut Simulator' },
    { id: 'offlineparadise',        name: 'Offline Paradise' },
    { id: 'osu',                    name: 'osu!' },
    { id: 'osumania',               name: 'osu!mania' },
    { id: 'ovo',                    name: 'ovo' },
    { id: 'pacman',                 name: 'Pacman' },
    { id: 'pandemic',               name: 'Pandemic' },
    { id: 'pandemic2',              name: 'Pandemic 2' },
    { id: 'paperio',                name: 'paper.io' },
    { id: 'papasburgeria',          name: 'Papas Burgeria' },
    { id: 'papasfreezeria',         name: 'Papas Freezeria' },
    { id: 'papaspizzeria',          name: 'Papas Pizzeria' },
    { id: 'pi',                     name: 'π Client' },
    { id: 'pizzatower',             name: 'Pizza Tower' },
    { id: 'pokemon',                name: 'Pokemon' },
    { id: 'polytrack',              name: 'PolyTrack' },
    { id: 'pong',                   name: 'Pong' },
    { id: 'pool',                   name: 'Pool' },
    { id: 'poom',                   name: 'POOM' },
    { id: 'pre',                    name: 'Precision Client' },
    { id: 'redball3',               name: 'Red Ball 3' },
    { id: 'redball4',               name: 'Red Ball 4' },
    { id: 'redball4vol2',           name: 'Red Ball 4 Vol 2' },
    { id: 'redball4vol3',           name: 'Red Ball 4 Vol 3' },
    { id: 'online-mc',              name: 'Resent Client' },
    { id: 'retrobowl',              name: 'Retro Bowl' },
    { id: 'retrobowlcollege',       name: 'Retro Bowl College' },
    { id: 'riddleschool',           name: 'Riddle School' },
    { id: 'riddleschool2',          name: 'Riddle School 2' },
    { id: 'riddleschool3',          name: 'Riddle School 3' },
    { id: 'riddleschool4',          name: 'Riddle School 4' },
    { id: 'riddleschool5',          name: 'Riddle School 5' },
    { id: 'riddleschooltransfer',   name: 'Riddle Transfer' },
    { id: 'riddleschooltransfer2',  name: 'Riddle Transfer 2' },
    { id: 'risehigher',             name: 'Rise Higher' },
    { id: 'rocketleague',           name: 'Rocket League' },
    { id: 'rooftopsnipers',         name: 'Rooftop Snipers' },
    { id: 'rooftopsnipers2',        name: 'Rooftop Snipers 2' },
    { id: 'ruffle',                 name: 'Ruffle' },
    { id: 'run',                    name: 'Run' },
    { id: 'run2',                   name: 'Run 2' },
    { id: 'run3',                   name: 'Run 3' },
    { id: 'russiancardriver',       name: 'Russian Car Driver' },
    { id: 'sand',                   name: 'Sand Game' },
    { id: 'sandtrix',               name: 'Sandtrix' },
    { id: 'shadow',                 name: 'Shadow Client' },
    { id: 'skibiditoilet',          name: 'Skibidi 1 v 100' },
    { id: 'skibiditoiletattack',    name: 'Skibidi Toilet Attack' },
    { id: 'skills',                 name: 'Soccer Skills' },
    { id: 'soccerrandom',           name: 'Soccer Random' },
    { id: 'solitaire',              name: 'Solitaire' },
    { id: 'slope',                  name: 'Slope' },
    { id: 'slope2',                 name: 'Slope 2' },
    { id: 'slope3',                 name: 'Slope 3' },
    { id: 'slope-ball',             name: 'Slope Ball' },
    { id: 'slowroads',              name: 'slowroads'},
    { id: 'snake',                  name: 'Snake' },
    { id: 'snow',                   name: 'Snowball Fighter' },
    { id: 'snowrider3d',            name: 'Snow Rider 3D' },
    { id: 'soundboard',             name: 'Soundboard' },
    { id: 'space',                  name: 'Spacebar Clicker' },
    { id: 'spankthemonkey',         name: 'Spank the Monkey' },
    { id: 'sprinter',               name: 'Sprinter' },
    { id: 'stack',                  name: 'Stack' },
    { id: 'stickmanboost',          name: 'Stickman Boost' },
    { id: 'stickmanclimb',          name: 'Stickman Climb' },
    { id: 'stickmangolf',           name: 'Stickman Golf' },
    { id: 'stickman-hook',          name: 'Stickman Hook' },
    { id: 'subway-surfers-ny',      name: 'Subway Surfers' },
    { id: 'superhot',               name: 'Superhot' },
    { id: 'supermario64',           name: 'Super Mario 64' },
    { id: 'supermeatboy',           name: 'Super Meat Boy' },
    { id: 'supersmashbros',         name: 'Super Smash Bros' },
    { id: 'supersmashflash',        name: 'Super Smash Flash' },
    { id: 'tabs',                   name: 'Totally Accurate Battle Simulator' },
    { id: 'templerun2',             name: 'Temple Run 2' },
    { id: 'tetris',                 name: 'Tetris' },
    { id: 'thefinalearth2',         name: 'The Final Earth 2' },
    { id: 'theimpossiblegame',      name: 'The Impossible Game' },
    { id: 'theimpossiblequiz',      name: 'The Impossible Quiz' },
    { id: 'thereisnogame',          name: 'There Is No Game' },
    { id: 'thirtydollarwebsite',    name: 'Thirty Dollar Website' },
    { id: 'thisistheonlylevel',     name: 'This Is The Only Level' },
    { id: 'thisistheonlylevel2',    name: 'This Is The Only Level 2' },
    { id: 'timeshooter1',           name: 'Time Shooter' },
    { id: 'timeshooter2',           name: 'Time Shooter 2' },
    { id: 'timeshooter3',           name: 'Time Shooter 3' },
    { id: 'tinyfishing',            name: 'Tiny Fishing' },
    { id: 'townscaper',             name: 'Townscaper' },
    { id: 'tron',                   name: 'Tron' },
    { id: 'tu46',                   name: 'TU-46' },
    { id: 'tu95',                   name: 'TU-95' },
    { id: 'tube-jumpers',           name: 'Tube Jumpers' },
    { id: 'tunnelrush',             name: 'Tunnel Rush' },
    { id: 'turbowarp',              name: 'Turbowarp' },
    { id: 'universal-paperclips',   name: 'Universal Paperclips' },
    { id: 'vex',                    name: 'Vex' },
    { id: 'vex2',                   name: 'Vex 2' },
    { id: 'vex3',                   name: 'Vex 3' },
    { id: 'vex4',                   name: 'Vex 4' },
    { id: 'vex5',                   name: 'Vex 5' },
    { id: 'vex6',                   name: 'Vex 6' },
    { id: 'vex7',                   name: 'Vex 7' },
    { id: 'wallsmash',              name: 'Wall Smash' },
    { id: 'watermelongame',         name: 'Watermelon Game' },
    { id: 'wbwwb',                  name: 'We Become What We Behold' },
    { id: 'weavesilk',              name: 'Weave Silk' },
    { id: 'webretro',               name: 'webretro' },
    { id: 'win11',                  name: 'Windows 11' },
    { id: 'xp',                     name: 'Windows XP' },
    { id: 'wordle',                 name: 'Wordle' },
    { id: 'wordlebot',              name: 'Wordle Bot' },
    { id: 'worldhardestgame2',      name: 'Worlds Hardest Game 2' },
    { id: 'worldshardestgame',      name: 'Worlds Hardest Game' },
    { id: 'xx142-b2.exe',           name: 'xx142-b2.exe' },
    { id: 'yohoho',                 name: 'Yohoho.io' },
    { id: 'zombocalypse',           name: 'Zombocalypse' },
    { id: 'asciispace',             name: 'ASCII Space' },
    { id: 'astray',                 name: 'Astray' },
    { id: 'backcountry',            name: 'Backcountry' },
    { id: 'blackholesquare',        name: 'Black Hole Square' },
    { id: 'bounceback',             name: 'Bounce Back' },
    { id: 'breaklock',              name: 'Breaklock' },
    { id: 'breakout',               name: 'Breakout' },
    { id: 'captaincallisto',        name: 'Captain Callisto' },
    { id: 'chromaincident',         name: 'Chroma Incident' },
    { id: 'chromedino',             name: 'Chrome Dino' },
    { id: 'connect3',               name: 'Connect 3' },
    { id: 'edgenotfound',           name: 'Edge Not Found' },
    { id: 'evilglitch',             name: 'Evil Glitch' },
    { id: 'konnekt',                name: 'Konnekt' },
    { id: 'ninjavsevilcorp',        name: 'Ninja vs Evilcorp' },
    { id: 'packabunchas',           name: 'Packabunchas' },
    { id: 'particleclicker',        name: 'Particle Clicker' },
    { id: 'pushback',               name: 'Push Back' },
    { id: 'q1k3',                   name: 'Q1k3' },
    { id: 'racer',                  name: 'Racer' },
    { id: 'radiusraid',             name: 'Radius Raid' },
    { id: 'retrohaunt',             name: 'Retrohaunt' },
    { id: 'roadblocks',             name: 'Road Blocks' },
    { id: 'shuttledeck',            name: 'Shuttledeck' },
    { id: 'sleepingbeauty',         name: 'Sleeping Beauty' },
    { id: 'spacecompany',           name: 'Space Company' },
    { id: 'spacegarden',            name: 'Space Garden' },
    { id: 'spacehuggers',           name: 'Space Huggers' },
    { id: 'themazeofspacegoblins',  name: 'The Maze of Space Goblins' },
    { id: 'towermaster',            name: 'Towermaster' },
    { id: 'trimps',                 name: 'Trimps' },
    { id: 'underrun',               name: 'Underrun' },
  ];

  const flashGames = [
    { id: '3dtanks', name: '3D Tanks' },
    { id: 'abobosbigadventure', name: 'Abobos Big Adventure' },
    { id: 'achievementunlocked3', name: 'Achievement Unlocked 3' },
    { id: 'actionturnip', name: 'Action Turnip' },
    { id: 'adaran', name: 'Adaran' },
    { id: 'adrenaline', name: 'Adrenaline' },
    { id: 'americanracing1', name: 'American Racing 1' },
    { id: 'americanracing2', name: 'American Racing 2' },
    { id: 'arkandianrevenant', name: 'Arkandian Revenant' },
    { id: 'armyofages', name: 'Army of Ages' },
    { id: 'awesomecars', name: 'Awesome Cars' },
    { id: 'awesomeplanes', name: 'Awesome Planes' },
    { id: 'battlepanic', name: 'Battle Panic' },
    { id: 'bloonsplayerpack2', name: 'Bloons Player Pack 2' },
    { id: 'bloonsplayerpack3', name: 'Bloons Player Pack 3' },
    { id: 'bloonsplayerpack4', name: 'Bloons Player Pack 4' },
    { id: 'bloonsplayerpack5', name: 'Bloons Player Pack 5' },
    { id: 'bobtherobber', name: 'Bob the Robber' },
    { id: 'boombot2', name: 'Boom Bot 2' },
    { id: 'boxhead2play', name: 'Boxhead 2Play' },
    { id: 'bubbletanks2', name: 'Bubble Tanks 2' },
    { id: 'bulletbill', name: 'Bullet Bill' },
    { id: 'bullettimefighting', name: 'Bullet Time Fighting' },
    { id: 'cactusmccoy', name: 'Cactus McCoy' },
    { id: 'cactusmccoy2', name: 'Cactus McCoy 2' },
    { id: 'cannonbasketball2', name: 'Cannon Basketball 2' },
    { id: 'cargobridge', name: 'Cargo Bridge' },
    { id: 'causality', name: 'Causality' },
    { id: 'computerbashing', name: 'Computer Bashing' },
    { id: 'crushthecastle', name: 'Crush the Castle' },
    { id: 'crushthecastle2', name: 'Crush the Castle 2' },
    { id: 'cyclomaniacs2', name: 'Cyclomaniacs 2' },
    { id: 'diggy', name: 'Diggy' },
    { id: 'donkeykong', name: 'Donkey Kong' },
    { id: 'dontshootthepuppy', name: 'Dont Shoot the Puppy' },
    { id: 'doodledefender', name: 'Doodle Defender' },
    { id: 'dragracing', name: 'Drag Racing' },
    { id: 'earntodie', name: 'Earn to Die' },
    { id: 'earntodie2', name: 'Earn to Die 2' },
    { id: 'earntodiesuperwheel', name: 'Earn to Die Super Wheel' },
    { id: 'electricman2', name: 'Electric Man 2' },
    { id: 'elephantquest', name: 'Elephant Quest' },
    { id: 'epicbattlefantasy3', name: 'Epic Battle Fantasy 3' },
    { id: 'epiccomboredux', name: 'Epic Combo Redux' },
    { id: 'exitpath', name: 'Exit Path' },
    { id: 'factoryballs2', name: 'Factory Balls 2' },
    { id: 'factoryballs3', name: 'Factory Balls 3' },
    { id: 'factoryballs4', name: 'Factory Balls 4' },
    { id: 'fancypantsadventure3', name: 'Fancy Pants Adventure 3' },
    { id: 'flashflightsimulator', name: 'Flash Flight Simulator' },
    { id: 'flight', name: 'Flight' },
    { id: 'fracuum', name: 'Fracuum' },
    { id: 'freerider2', name: 'Free Rider 2' },
    { id: 'getontop', name: 'Get on Top' },
    { id: 'giveuprobot', name: 'Give Up Robot' },
    { id: 'giveuprobot2', name: 'Give Up Robot 2' },
    { id: 'hanger', name: 'Hanger' },
    { id: 'hanger2', name: 'Hanger 2' },
    { id: 'hobo', name: 'Hobo' },
    { id: 'hobo2', name: 'Hobo 2' },
    { id: 'hobo3', name: 'Hobo 3' },
    { id: 'hobo4', name: 'Hobo 4' },
    { id: 'hobo5', name: 'Hobo 5' },
    { id: 'hobo6', name: 'Hobo 6' },
    { id: 'hobo7', name: 'Hobo 7' },
    { id: 'houseofwolves', name: 'House of Wolves' },
    { id: 'interactivebuddy', name: 'Interactive Buddy' },
    { id: 'jacksmith', name: 'Jacksmith' },
    { id: 'jellytruck', name: 'Jelly Truck' },
    { id: 'johnnyupgrade', name: 'Johnny Upgrade' },
    { id: 'jumpix2', name: 'Jumpix 2' },
    { id: 'knightmaretower', name: 'Knightmare Tower' },
    { id: 'learn2fly3', name: 'Learn 2 Fly 3' },
    { id: 'magnetface', name: 'Magnet Face' },
    { id: 'mariocombat', name: 'Mario Combat' },
    { id: 'marioracingtournament', name: 'Mario Racing Tournament' },
    { id: 'meatboy', name: 'Meat Boy' },
    { id: 'megamanprojectx', name: 'Mega Man Project X' },
    { id: 'metroidelements', name: 'Metroid Elements' },
    { id: 'mineblocks', name: 'Mine Blocks' },
    { id: 'mirrorsedge', name: 'Mirrors Edge' },
    { id: 'moneymovers', name: 'Money Movers' },
    { id: 'moneymovers3', name: 'Money Movers 3' },
    { id: 'motherload', name: 'Motherload' },
    { id: 'multitask', name: 'Multitask' },
    { id: 'mutilateadoll2', name: 'Mutilate A Doll 2' },
    { id: 'myangel', name: 'My Angel' },
    { id: 'nanotube', name: 'Nanotube' },
    { id: 'newgroundsrumble', name: 'Newgrounds Rumble' },
    { id: 'ngame', name: 'N Game' },
    { id: 'nitromemustdie', name: 'Nitrome Must Die' },
    { id: 'nucleus', name: 'Nucleus' },
    { id: 'nv2', name: 'NV 2' },
    { id: 'nyancatlostinspace', name: 'Nyan Cat Lost in Space' },
    { id: 'offroaders', name: 'Offroaders' },
    { id: 'onemanarmy2', name: 'One Man Army 2' },
    { id: 'outofthisworld', name: 'Out of This World' },
    { id: 'papalouie', name: 'Papa Louie' },
    { id: 'papalouie2', name: 'Papa Louie 2' },
    { id: 'papalouie3', name: 'Papa Louie 3' },
    { id: 'picosschool', name: 'Picos School' },
    { id: 'picosschool2', name: 'Picos School 2' },
    { id: 'pirates', name: 'Pirates' },
    { id: 'polarjump', name: 'Polar Jump' },
    { id: 'portal', name: 'Portal' },
    { id: 'portal2d', name: 'Portal 2D' },
    { id: 'quadrobarreldefence', name: 'Quadrobarrel Defence' },
    { id: 'qubeythecube', name: 'Qubey the Cube' },
    { id: 'qwop', name: 'QWOP' },
    { id: 'raftwars', name: 'Raft Wars' },
    { id: 'raftwars2', name: 'Raft Wars 2' },
    { id: 'raze', name: 'Raze' },
    { id: 'redball', name: 'Red Ball' },
    { id: 'redball2', name: 'Red Ball 2' },
    { id: 'redshift', name: 'Redshift' },
    { id: 'revenant2', name: 'Revenant 2' },
    { id: 'saszombieassault3', name: 'SAS Zombie Assault 3' },
    { id: 'sentryknight', name: 'Sentry Knight' },
    { id: 'shoppingcarthero3', name: 'Shopping Cart Hero 3' },
    { id: 'siftheads', name: 'Sift Heads' },
    { id: 'siftheads2', name: 'Sift Heads 2' },
    { id: 'siftheads3', name: 'Sift Heads 3' },
    { id: 'siftheads4', name: 'Sift Heads 4' },
    { id: 'siftheads5', name: 'Sift Heads 5' },
    { id: 'sniperassassin4', name: 'Sniper Assassin 4' },
    { id: 'sportsheadsfootball', name: 'Sports Heads Football' },
    { id: 'sportsheadsracing', name: 'Sports Heads Racing' },
    { id: 'sportsheadstennis', name: 'Sports Heads Tennis' },
    { id: 'stickrpg', name: 'Stick RPG' },
    { id: 'stickrun2', name: 'Stick Run 2' },
    { id: 'stickwar', name: 'Stick War' },
    { id: 'strikeforceheroes2', name: 'Strike Force Heroes 2' },
    { id: 'strikeforcekittylaststand', name: 'Strike Force Kitty Last Stand' },
    { id: 'sugarsugar', name: 'Sugar Sugar' },
    { id: 'sugarsugar2', name: 'Sugar Sugar 2' },
    { id: 'sugarsugar3', name: 'Sugar Sugar 3' },
    { id: 'superd', name: 'Super D' },
    { id: 'superfighters', name: 'Superfighters' },
    { id: 'supermario63', name: 'Super Mario 63' },
    { id: 'supermarioflash', name: 'Super Mario Flash' },
    { id: 'supermarioflash2', name: 'Super Mario Flash 2' },
    { id: 'swordsandsandals2', name: 'Swords and Sandals 2' },
    { id: 'tacticalassassin', name: 'Tactical Assassin' },
    { id: 'tanks', name: 'Tanks' },
    { id: 'tanktrouble', name: 'Tank Trouble' },
    { id: 'thebindingofisaac', name: 'The Binding of Isaac' },
    { id: 'thegame', name: 'The Game' },
    { id: 'theimpossiblequiz2', name: 'The Impossible Quiz 2' },
    { id: 'thingthingarena', name: 'Thing Thing Arena' },
    { id: 'tosstheturtle', name: 'Toss the Turtle' },
    { id: 'truckloader4', name: 'Truck Loader 4' },
    { id: 'ultimateflashsonic', name: 'Ultimate Flash Sonic' },
    { id: 'ultimatetactics', name: 'Ultimate Tactics' },
    { id: 'unrealflash', name: 'Unreal Flash' },
    { id: 'warfare1917', name: 'Warfare 1917' },
    { id: 'warfare1944', name: 'Warfare 1944' },
    { id: 'warp', name: 'Warp' },
    { id: 'xenos', name: 'Xenos' },
    { id: 'xtremecliffdiving', name: 'Xtreme Cliff Diving' },
    { id: 'yearofthesnake', name: 'Year of the Snake' },
    { id: 'yuriusshouseofspooks', name: 'Yurius House of Spooks' },
    { id: 'zombiealienparasites', name: 'Zombie Alien Parasites' }
  ]

const externalSources = {
    'polytrack': 'https://script.google.com/macros/s/AKfycbzuhv-wKflC3QgCI_d8xsy90ngRlqgKj-qfICMuzhimGuYwWXFI5tPWwwfjrYk-biJu/exec',
    'slowroads': 'https://script.google.com/macros/s/AKfycbzqDA2SnuVZ3DRelxxbUxSV9Z1RJz_gQfDRx06WUpgppWgrdDEErtZ1Lev9O6j2w9ioBQ/exec',
  };

 let selected = null;
 let disguised = true;  // ← add this
 let searchQuery = '';

  function selectGame(game) {
    selected = game;
  }

  // Combine both arrays so they can be searched and displayed together
  $: allGames = [...games, ...flashGames];

  // Reactive derived state for filtered games
  $: filteredGames = allGames
    .filter(game => game.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Check if the selected game belongs to the flash games array
  $: isFlash = selected ? flashGames.some(g => g.id === selected.id) : false;

  // Resolve the URL for HTML5 and external games
  $: gameUrl = selected 
    ? (externalSources[selected.id] ?? `/unblocked/${selected.id}/index.html`) 
    : '';

  function openFullscreen() {
    if (!selected) return;
    
    if (isFlash) {
      // Use the browser's native fullscreen API on the embed element
      const el = document.querySelector('.game-iframe');
      if (el && el.requestFullscreen) {
        el.requestFullscreen();
      }
    } else if (gameUrl) {
      // HTML5 games can open in a new tab safely
      window.open(gameUrl, '_blank');
    }
  }
</script>

<style>
  /* Catppuccin Macchiato CSS Variables */
  :global(*), :global(*::before), :global(*::after) {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  @font-face {
    font-family: 'JetBrains Mono';
    src: url('/jetbrainsmono.ttf') format('truetype');
    font-weight: 100 900;
    font-style: normal;
  }

  :global(:root) {
    --base:      #24273a;
    --mantle:    #1e2030;
    --crust:     #181926;
    --surface0:  #363a4f;
    --surface1:  #494d64;
    --surface2:  #5b6078;
    --overlay0:  #6e738d;
    --overlay1:  #8087a2;
    --overlay2:  #939ab7;
    --subtext0:  #a5adcb;
    --subtext1:  #b8c0e0;
    --text:      #cad3f5;
    --lavender:  #b7bdf8;
    --blue:      #8aadf4;
    --sapphire:  #7dc4e4;
    --sky:       #91d7e3;
    --teal:      #8bd5ca;
    --green:     #a6da95;
    --yellow:    #eed49f;
    --peach:     #f5a97f;
    --maroon:    #ee99a0;
    --red:       #ed8796;
    --mauve:     #c6a0f6;
    --pink:      #f5bde6;
    --flamingo:  #f0c6c6;
    --rosewater: #f4dbd6;

    --accent: var(--mauve);
    --font-ui: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
  }

  :global(body) {
    background: var(--base);
    color: var(--text);
    font-family: var(--font-ui);
    height: 100dvh;
    overflow: hidden;
  }

  /* ── Layout ── */
  .layout {
    display: grid;
    grid-template-columns: 240px 1fr;
    grid-template-rows: 100dvh;
    height: 100dvh;
  }

  /* ── Sidebar ── */
  .sidebar {
    background: var(--mantle);
    border-right: 1px solid var(--surface0);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .sidebar-header {
    padding: 18px 16px 12px;
    flex-shrink: 0;
  }

  .sidebar-title {
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--accent);
  }

  .sidebar-subtitle {
    font-size: 0.65rem;
    color: var(--overlay0);
    margin-top: 3px;
    letter-spacing: 0.05em;
  }

  /* ── Search Bar ── */
  .search-container {
    padding: 0 16px 14px;
    border-bottom: 1px solid var(--surface0);
    flex-shrink: 0;
  }

  .search-input {
    width: 100%;
    background: var(--crust);
    border: 1px solid var(--surface0);
    color: var(--text);
    font-family: var(--font-ui);
    font-size: 0.75rem;
    padding: 8px 12px;
    border-radius: 4px;
    outline: none;
    transition: border-color 0.15s ease, background 0.15s ease;
  }

  .search-input::placeholder {
    color: var(--overlay0);
  }

  .search-input:focus {
    border-color: var(--accent);
    background: var(--base);
  }

  .sidebar-scroll {
    overflow-y: auto;
    flex: 1;
    padding: 8px 0;
    scrollbar-width: thin;
    scrollbar-color: var(--surface1) transparent;
  }

  .sidebar-scroll::-webkit-scrollbar {
    width: 4px;
  }

  .sidebar-scroll::-webkit-scrollbar-track {
    background: transparent;
  }

  .sidebar-scroll::-webkit-scrollbar-thumb {
    background: var(--surface1);
    border-radius: 2px;
  }

  .game-item {
    display: flex;
    align-items: center;
    padding: 9px 16px;
    cursor: pointer;
    border-radius: 0;
    transition: background 0.12s ease, color 0.12s ease;
    position: relative;
    color: var(--subtext0);
    font-size: 0.78rem;
    letter-spacing: 0.02em;
    border-left: 2px solid transparent;
    user-select: none;
  }

  .game-item:hover {
    background: var(--surface0);
    color: var(--text);
  }

  .game-item.active {
    background: var(--surface0);
    color: var(--accent);
    border-left-color: var(--accent);
  }

  .game-name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .no-results {
    padding: 20px 16px;
    text-align: center;
    font-size: 0.75rem;
    color: var(--overlay0);
    letter-spacing: 0.02em;
  }

  /* ── Main area ── */
  .main {
    display: flex;
    flex-direction: column;
    background: var(--base);
    overflow: hidden;
  }

  .iframe-wrapper {
    flex: 1;
    position: relative;
    overflow: hidden;
    background: var(--crust);
  }

  .game-iframe {
    width: 100%;
    height: 100%;
    border: none;
    display: block;
  }

  .placeholder-state {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: var(--overlay0);
    gap: 16px;
    text-align: center;
    font-size: 0.85rem;
    letter-spacing: 0.02em;
  }

  .placeholder-icon {
    width: 48px;
    height: 48px;
    opacity: 0.6;
  }

  /* ── Bottom bar ── */
  .bottom-bar {
    height: 48px;
    flex-shrink: 0;
    background: var(--mantle);
    border-top: 1px solid var(--surface0);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
  }

  .bottom-game-name {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .bottom-label {
    font-size: 0.75rem;
    letter-spacing: 0.04em;
    color: var(--subtext1);
  }

  .bottom-label span {
    color: var(--accent);
    font-weight: 600;
  }

  .fullscreen-btn {
    display: flex;
    align-items: center;
    gap: 7px;
    background: var(--surface0);
    border: 1px solid var(--surface1);
    color: var(--text);
    font-family: var(--font-ui);
    font-size: 0.72rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 6px 14px;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  }

  .fullscreen-btn:hover {
    background: var(--surface1);
    border-color: var(--accent);
    color: var(--accent);
  }

  .fullscreen-btn svg {
    width: 13px;
    height: 13px;
    stroke: currentColor;
    fill: none;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.disguise-btn {
  background: none;
  border: 1px solid var(--surface1);
  border-radius: 4px;
  color: var(--overlay1);
  cursor: pointer;
  padding: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s ease, border-color 0.15s ease, background 0.15s ease;
  flex-shrink: 0;
}

.disguise-btn svg {
  width: 15px;
  height: 15px;
}

.disguise-btn:hover {
  color: var(--text);
  border-color: var(--overlay1);
  background: var(--surface0);
}

.disguise-btn.active {
  color: var(--green);
  border-color: var(--green);
}
</style>

<div class="layout">

  <aside class="sidebar">
<div class="sidebar-header">
  <div class="header-row">
    <div>
      <div class="sidebar-title">Games</div>
      <div class="sidebar-subtitle">{filteredGames.length} available</div>
    </div>
    <button
      class="disguise-btn"
      class:active={disguised}
      on:click={() => disguised = !disguised}
      title={disguised ? 'Disguise on' : 'Disguise off'}
      aria-label="Toggle disguise"
    >
      {#if disguised}
        <!-- Eye with slash (disguised) -->
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
          <line x1="1" y1="1" x2="23" y2="23"/>
        </svg>
      {:else}
        <!-- Eye open (not disguised) -->
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      {/if}
    </button>
  </div>
</div>
    <div class="search-container">
      <input 
        type="text" 
        class="search-input" 
        placeholder="Search games..." 
        bind:value={searchQuery}
        aria-label="Search games"
      />
    </div>

    <div class="sidebar-scroll">
      {#if filteredGames.length > 0}
        {#each filteredGames as game (game.id)}
          <div
            class="game-item"
            class:active={selected && selected.id === game.id}
            on:click={() => selectGame(game)}
            role="button"
            tabindex="0"
            on:keydown={(e) => e.key === 'Enter' && selectGame(game)}
            aria-label="Play {game.name}"
            aria-current={selected && selected.id === game.id ? 'page' : undefined}
          >
            <span class="game-name">{game.name}</span>
          </div>
        {/each}
      {:else}
        <div class="no-results">No games found matching "{searchQuery}"</div>
      {/if}
    </div>
  </aside>

  <main class="main">
    <div class="iframe-wrapper">
      {#if selected}
        {#key selected.id}
          {#if isFlash}
            <embed
              class="game-iframe"
              src={`/unblocked/flash/${selected.id}.swf`}
              type="application/x-shockwave-flash"
              width="100%"
              height="100%"
            />
          {:else}
            <iframe
              class="game-iframe"
              src={gameUrl}
              title={selected.name}
              sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock"
              allowfullscreen
            ></iframe>
          {/if}
        {/key}
      {:else}
        <div class="placeholder-state">
          <svg class="placeholder-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          <p>Select a game from the sidebar to begin</p>
        </div>
      {/if}
    </div>

    {#if selected}
      <div class="bottom-bar">
        <div class="bottom-game-name">
          <span class="bottom-label">Now playing: <span>{selected.name}</span></span>
        </div>

        <button class="fullscreen-btn" on:click={openFullscreen} aria-label="Open {selected.name} fullscreen">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <polyline points="15 3 21 3 21 9"></polyline>
            <polyline points="9 21 3 21 3 15"></polyline>
            <line x1="21" y1="3" x2="14" y2="10"></line>
            <line x1="3" y1="21" x2="10" y2="14"></line>
          </svg>
          Fullscreen
        </button>
      </div>
    {/if}
  </main>

</div>