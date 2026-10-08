# かっこいい秘密組織のためのかっこいいプログラミング言語入門 Elm 編 実践

後半では，関数型言語でのアプリ作成を，ポーカーアプリの作成を通して学びます．

[よく使うリンク](../#よく使うリンク)のEllieで成果物を共有しながら進めて行きます．



## Ellieを触る

Ellieを開いてサンプルコードを確認しましょう．左側にコード(ELM, HTML)，右側に実行結果のボタンと数字が出ているはずです．

左のコードを弄って，COMPILEを押すと右側で動かす（もしくはコンパイルエラーが出る），というのを繰り返してアプリを作っていきましょう．

他の人の作ったパッケージのimportや，DEBUGの支援，外部から読み込んだ関数にカーソルを合せるとドキュメントへのリンクが出てくる便利機能もありますが，必要になったらで良いでしょう．

今は，右の「+1」「-1」のボタンをポチポチして，それらの間の数字が増減することを確かめ，左のコードがもうアプリとして動作するものだということに納得して先に進みます．



## サンプルコードのアウトライン

ここでは，このサンプル（カウンター）を元に，アプリを作るときのコードの全体像を説明します．

上から

- module
- import
- 型と関数（とports）

を並べます．

型と関数はreplでやったものと同じです．moduleも，1ファイルでプログラムが完結する場合は，このままコピペで問題ないので，しばらくはおまじないとしておきましょう．



## import

[外部モジュール関数の呼出し](../#外部モジュール関数の呼出し)で，「モジュール」という名前を分ける機構があることを学びました．`List.map`などはそのまま使えましたが，一般のモジュールはimportと書いてからでないと使えません．

例えば，
```elm
import Browser
```
と書いているので，最下部で`Browser.sandbox`と関数を使えているわけです．

このようにして外部モジュールをimportします．

### exposing

もう少しimportを見ていきましょう．

```elm
import Html exposing (Html, button, div, text)
```

`exposing`とありますね．後ろに型や関数名を指定すると，それらをモジュール名を省略して呼ぶことができるようになります．

例えば，`view`関数の`div`は，本来`Html.div`と書く必要があります．

```elm
view : Model -> Html Msg
view model =
    div []
        [ button [ onClick Increment ] [ text "+1" ]
        , div [] [ text <| String.fromInt model.count ]
        , button [ onClick Decrement ] [ text "-1" ]
        ]
```

これを`exposing`によって，このコード内で定義したかのように`div`だけで関数を使えるようになります．

`exposing`にはそのモジュール内全部を対象にする，`(..)`という指定もあります．ただ，何を使えるのか把握しきれないので，個人的には使うのは`Html`モジュールくらいです（HTMLの各種タグが入っていて，種類が多く，列挙が面倒なため）．

自分で定義した名前が`exposing`した名前と衝突した場合，自分で定義した方が優先されます．

:::note[exposing (..)での名前の衝突]
実は同じ関数名を含む複数のモジュールを`exposing (..)`することもできます．ただし，衝突している名前を「使った」ときはコンパイルエラーとなります．エラーメッセージには対処法のほか，「複数`exposing (..)`はしない方がいい」というアドバイスもあります．
:::

### as

より短く外部の関数名や型名を指定したい場合の他の選択肢として，`as`を使ったモジュールの別名があります．

サンプルに
```elm
import Html.Events exposing (onClick)
```
とあるように，`onClick`の属するパッケージは`Html.Events`という名前です．

某魔法使いのおばあさんのごとく「`Html.Events`というのかい．贅沢な名だね．今からお前の名前は`E`だ．」という気持ちになったら，以下のように書きます．

```elm
import Html.Events as E
```

こうすると`E.onClick`で呼び出せます（別に名前を奪ってはいないので，`Html.Events.onClick`も使えます）．

別名は1文字でなくても良いですが，大文字ではじめる必要があります．違反すると，例によって丁寧なエラーメッセージが表示され，どんな略称が使われているのかの例が見れます．やってみましょう．

`as`もまた既存の名称と衝突させることができ，例えば以下のように，せっかくevanzが分類したモジュールを混ぜ合せる冒涜的行為も可能です．

```elm
import Html.Events as Html
```



## The Elm Archtecture（TEA）

`module`はコピペ，`import`も使える，型も関数も書けるので，文法的にはもうアプリを書けますが，まだどうアプリになるのかがピンとこないと思います．今までやってきたのは純粋な関数を定義する方法なので，アプリのような状態の管理と書き換えは守備範囲外です．

そこで出てくるのがElmのフレームワーク部分，TEA（ティー）と呼ばれる特徴的な仕組みです．

TEAは`Model`, `View`, `Update`という要素からなります．

- **Model**: アプリの状態を表す型
- **View**: 状態をHTMLに変換する関数
- **Update**: 状態を更新する関数

サンプルコードと共に見ていきましょう．（サンプルが荒れ果ててしまった人はEllieのページを開き直してください．）



## Model TEA

Modelはアプリの全状態を表す型です．

```elm
type alias Model =
    { count : Int }
```

サンプルでは，カウンターの数値だけが入ったレコード型です．カウンターアプリなので，現在のカウント中の数値だけが状態の全て，ということです．

Modelはレコード型である必要はありませんし，何なら`Model`という型名は必須ではありません．しかし，役割が分かりやすいように`Model`と名付けておくとよいでしょう．雑多なデータを全部入れるので，それぞれに名前を付けられるレコード型も無難な選択です．

### init

Modelは型だけでなく，初期値も必要になります．`Model`型の（定数）関数として用意します．

サンプルでは`initialModel`という（定数）関数がそれにあたります．

```elm
initialModel : Model
initialModel =
    { count = 0 }
```



## View TEA

Viewは描画用の関数です．これは型が決まっていて，`model -> Html msg`です．現在のアプリの状態を引数にとって，描画用のHtmlを返す関数です．

2つの型変数，`model`と`msg`がありますが，アプリごとに型を決めるために，フレームワークでは型変数となっています．もちろん，今回の`model`は先ほどの`Model`を使います．

`msg`は状態を更新する指示の型なのですが，**Update**と一緒に見た方が分かりやすいので，一旦わきに置きましょう．`List a`が何かのリストであるように，`Html msg`も何かのHtmlです．

`view : model -> Html msg`は，アプリの状態を引数にとってHTMLを返す関数なのだ，と意識しながら実装を見ましょう．

```elm
view : Model -> Html Msg
view model =
    div []
        [ button [ onClick Increment ] [ text "+1" ]
        , div [] [ text <| String.fromInt model.count ]
        , button [ onClick Decrement ] [ text "-1" ]
        ]
```

何やら複雑そうですが，文法の知識で構造を読む良い練習です．

はじめの行は型注釈で，続く行からが関数本体です．

`view`という名前の関数で，引数，`model`があり，これは型注釈と見比べると`Model`型とわかります．ということはイコールの右辺は残った`Html Msg`型です．

右辺は（改行も含みますが）`div`と2つのリストが「ならんで」いるので，関数適用だとわかります．

あとは各関数の中身なのですが，出力結果を見る方が分かりやすいので，HTMLを先に見ましょう．（ブラウザの開発者ツール（F12）などで確認できます）

```html
<div>
  <button onClick=｛Incrementのイベント｝>+1</button>
  <div>｛model.countの内容｝</div>
  <button onClick=｛Decrementのイベント｝>-1</button>
</div>
```

HTMLに習熟した人であれば，もう使い方が分かったかもしれません．`div`，`button`の各関数はタグと対応し，引数の2つのリストはそれぞれ，属性，子要素と対応します．

:::details[HTML全くわからん人へのざっくり解説]
HTMLは，そういう名前のテキストのフォーマットです．ブラウザが読んで，いい感じにレイアウトして表示するためのやつです．（今はMarkdownの方が有名かもしれません）

特徴は入れ子の構造で，箱の中に箱をいれて，文章を並べたりグループ化したりします．箱やその中身は，要素とかノードとかと呼ばれます．ブログの記事の中にタイトルと複数の段落が並んでいたり，記事自体を1ページに複数並べたり，そういうネストできるものです．

箱には，記事，段落，箇条書き，画像，ボタン…のような種別があって，`<article>...</article>`のような対で記述します．対のそれぞれを開きタグ，閉じタグと呼び，間に他の要素を記述することで入れ子になります．

各箱には属性，というものも設定できて，リンク先，大きさ，色，余白，クリックしたときの動作などを指定できます．

実際の利用では，各所の位置合わせなどのために，驚くほど深くネストされています．[Googleの検索結果ページ](https://www.google.com/search?q=google)を開発者ツールで確認してください．各ページの説明文はまるで玉ねぎの芯です．

- [公式の仕様](https://html.spec.whatwg.org/multipage/)
- びっくりするほど丁寧な[Mozillaの解説（日本語版）](https://developer.mozilla.org/ja/docs/Web/HTML)
:::

`div`にカーソル（マウスポインタでなくテキスト編集の方）を合せて出てくるリンクから，ドキュメントを参照しましょう．

説明は極めてシンプルですが，`div : List (Attribute msg) -> List (Html msg) -> Html msg`という型だけでも，`Attribure`（属性）のリストと`Html`（子要素）のリストを引数に取ることが読み取れます．

覚えておくべきは，
```html
<div {onclickとか}>
  {中に入れたい要素}
</div>
```
のようなHTMLを作りたいときは
```elm
div [{onclickとか}] [{中に入れたい要素}]
```
のようなElmコードを書けばよい，というだけです．（とりさんはよく属性の空リストを書き忘れます）  
このインターフェースはHtml全体で共通なので，HTMLに習熟している人であれば**View**は難しくないでしょう．

タグは[Html](https://package.elm-lang.org/packages/elm/html/1.0.1/Html)，属性は[Html.Attributes](https://package.elm-lang.org/packages/elm/html/1.0.1/Html-Attributes)，イベント系は[Html.Events](https://package.elm-lang.org/packages/elm/html/1.0.1/Html-Events)のモジュールにまとまっています．

### 演習 View

サンプルの`view`関数を編集し，次の動作を実現せよ．

1. -1 ボタンを2つにせよ．
2. -1 ボタンをカウンタの数だけ表示せよ．0以下の場合は表示しない．

早く終わって暇な人は，[String.repeat](https://package.elm-lang.org/packages/elm/core/latest/String#repeat)を使って，💩でカウントできるようにしてください．

:::answer[解答例]
1. 単純に2つ書けば2つになります．

```elm
view : Model -> Html Msg
view model =
    div []
        [ button [ onClick Increment ] [ text "+1" ]
        , div [] [ text <| String.fromInt model.count ]
        , button [ onClick Decrement ] [ text "-1" ]
        , button [ onClick Decrement ] [ text "-1" ]
        ]
```

2. model.count要素ならべればmodel.countつになります．
```elm
view : Model -> Html Msg
view model =
    let
      plusButton = button [ onClick Increment ] [ text "+1" ]

      countDiv = div [] [ text <| String.fromInt model.count ]

      minusButtons =
        List.range 1 model.count
        |> List.map (\_ -> button [ onClick Decrement ] [ text "-1" ])
    in
      div [] (plusButton :: countDiv :: minusButtons)
```

`List.range 1 model.count |> List.map`の代わりに，[`List.repeat`](https://package.elm-lang.org/packages/elm/core/latest/List#repeat)を使うとより簡潔です．
:::



## Update TEA

さて，最後は**Update**，状態の更新方法を定義する関数です．

型は`msg -> model -> model`です．**View**で触れたように`model`はアプリごとに定義する`Model`です．`msg`も，これまたアプリごとに定義する，更新を指示するメッセージという型です．通常`Msg`という名前で定義します．

サンプルの`Msg`の定義を見てみましょう．

```elm
type Msg
    = Increment
    | Decrement
```

カウンターアプリにとって状態の更新は2種類，`Increment`と`Decrement`と定義されています．

これを受ける`update`関数は以下のように，`Msg`の内容でmodel.countの増減が分岐します．

```elm
update : Msg -> Model -> Model
update msg model =
    case msg of
        Increment ->
            { model | count = model.count + 1 }

        Decrement ->
            { model | count = model.count - 1 }
```

また，型変数の`msg`は`update`と`view`で同じものを指定する必要があります．ボタンのHtmlの生成部分が分かりやすいでしょう．

```elm
button [ onClick Increment ] [ text "+1" ]
```

`onClick : msg -> Attribute msg`を`Increment : Msg`に適用すると`onClick Increment : Attribute Msg`となり，属性になります．関数型っぽく説明するなら，この値は「クリックしたときインクリメントの必要がある属性」となるでしょうか．

全体としてボタンは`button [ onClick Increment ] [ text "+1" ] : Html Msg`となり，`Increment`または`Decrement`のメッセージを送る可能性のある`Html Msg`という型になります．

ボタンもこの時点では何か動作をしているわけでなく，ボタンを返す関数を適用しただけです．「クリックしたときインクリメントの必要がある属性のついた，内部に"+1"とテキストのあるボタン」という値に過ぎません．

### 演習 View

サンプルの`Msg`，`update`および`view`を編集し，カウントを0にする「リセット」ボタンを追加せよ．

:::answer[解答例]

```elm
type Msg
    = Increment
    | Decrement
    | Reset


update : Msg -> Model -> Model
update msg model =
    case msg of
        Increment ->
            { model | count = model.count + 1 }

        Decrement ->
            { model | count = model.count - 1 }
        
        Reset ->
            { model | count = 0 }
        


view : Model -> Html Msg
view model =
    div []
        [ button [ onClick Increment ] [ text "+1" ]
        , div [] [ text <| String.fromInt model.count ]
        , button [ onClick Decrement ] [ text "-1" ]
        , div [] []
        , button [ onClick Reset ] [ text "リセット" ]
        ]
```

`Msg`を追加し，`update`の分岐を増やし，`view`で対応するボタンを増やせば完成です．

HTMLのbuttonはinline要素のため，そのままだと"-1"と"リセット"が横に並びます．
今回は空の`div`を挟んで雑に改行しました．
ちゃんと作るときは，buttonを他の要素で包むなり，CSSを書くなり，HTMLの作法に則るべし．
:::

### Model-View-Update

TEAのフレームワーク側から動作を見ると概ね以下のようになります．

- アプリの状態を表す`Model`型の変数を保持する
  - 初回は`init`関数から取得する
- 状態に変更があるたび`view`に渡して描画し直す
- イベントがあれば`Msg`として`update`に渡して状態を更新する

このようにして，関数を用意するだけで実際に動作するアプリを作ることができるのです．

最後にmain関数を見てみましょう．全体のコードはこの1つの関数を定義するためにあります．

```elm
main : Program () Model Msg
main =
    Browser.sandbox
        { init = initialModel
        , view = view
        , update = update
        }
```

関数`Browser.sandbox`を，初期状態を与える`init`と，描画用の`view`，更新用の`update`からなるレコードに適用しています．

全体の型は`Program () Model Msg`とあるように，3つの型引数を伴う`Program`型です（`()`の部分はJava Script側から初期値を与えるときに使う型です）．
`main`も言語内ではただの定数関数で，「これらの関数からなるプログラム」を示す値にすぎません．

`Browser.sandbox`の型は
```
sandbox :
    { init : model
    , view : model -> Html msg
    , update : msg -> model -> model
    }
    -> Program () model msg
```
となっており，引数のレコード内で`model`や`msg`がの一貫性が保証されます．

`Program`を作る関数は他にもあります．

- **sandbox**: 今回紹介した最小構成
- **element**: ページ全体でなく1要素として埋め込む用
- **document**: ページタイトルを変えられる
- **application**: URLを変えられる

このアプリ作成では基本的に`sandbox`を使う予定ですが，乱数の都合で`element`も利用するかもしれません．

----



## ポーカーアプリの仕様

今回作るのは一人用のファイブカード・ドローです．

カードを5枚引き，任意の枚数捨てて引き直し，役ができるかどうか，というものです．

役によって得点を付けて連続でゲームできるようにする，ダブルアップできるようにする，など拡張は考えられますが，まずは役を判定するところまでを目指します．



## まずは表示する

アプリを作るときは`view`から作るのがおススメです．
見えて動くとデバッグがしやすいですし，モチベになりますからね．

理由からわかるように，`view`を作りきるのではなく，表示できるようになったら`update`に最も基本的な機能を追加し，徐々に動く範囲を増やしていきます．

### カードの定義

まずは表示するカードを定義しましょう．

カスタム型で以下のようにします．

```elm
type Card = Card Suit Rank
```

以下のようにタプルを使っても良いですが，今回はとりあえずカスタム型にしました．

```elm
type alias Card = ( Suit, Rank )
```

スートは，前半で[カスタム型を学んだときの定義](../#列挙するカスタム型)があるのでそれを使います．

Rank型は作っても構わないですが，とりあえずIntとしておきます．

**Cardの定義**
```elm
type Card = Card Suit Rank

type Suit
    = Spade
    | Heart
    | Diamond
    | Club

suitToString : Suit -> String
suitToString suit =
    case suit of
        Spade -> "♠"
        Heart -> "♥"
        Diamond -> "♦"
        Club -> "♣"

type alias Rank = Int
```

### はじめのview

まずは手札が表示できると良いので，`List Card`を表示できるように…
といいたい所ですがここは刻みます．

まずは`type alias Model = Card`として，1枚表示します．HTMLもtext要素だけでいいでしょう．

文字列にするには`suitToString`と`String.fromInt`が使えますね．

```elm
view : Model -> Html Msg
view (Card suit rank) =
      text <| suitToString suit ++ String.fromInt rank
```

ちょっとオシャレに書きました．

`(Card suit rank)`はパターンが1つの場合の分解は引数の位置で行えるのを使います．

左向きのパイプはHtmlの属性等でよく使われます．
今回はtextですが，「右辺の結果」のtextという演出です．

### 虚無のupdate

`main`には`update`が必要なので，以下のように何もしない`update`を作ります．

```elm
type Msg
    = None

update : Msg -> Model -> Model
update msg model =
    model
```

`Msg`は未定なので`None`という値のみ，`update`は常に元のモデルを返す更新しないものをとします．

### Modelの初期値

`main`には`init`が必要なので，以下のように好きなカード1枚を初期値にします．

```elm
initialModel : Model
initialModel = Card Spade 1
```

後はmoduleとimport，`main`をサンプルと同じように定義すれば，コンパイルは通るはずです．

:::details[完成品]

先頭に`main`を置いていますが，Model-View-Updateがどの関数と対応しているのか，プログラムの概要を忘れた際に便利だからです（普段はimportなどと共に読み飛ばします）．

また，役割ごとに関数をまとめておくとコードが増えたときに便利です．
解説し忘れましたが，`--`でコメントが書けます（行中に書くと移行がコメント）．

```elm
module Main exposing (main)

import Browser
import Html exposing (Html, text)



main =
    Browser.sandbox
        { init = initialModel
        , view = view
        , update = update
        }



-----------
-- MODEL --
-----------

type alias Model = Card

type Card = Card Suit Rank

type Suit
    = Spade
    | Heart
    | Diamond
    | Club

suitToString suit =
    case suit of
        Spade -> "♠"
        Heart -> "♥"
        Diamond -> "♦"
        Club -> "♣"

type alias Rank = Int

initialModel : Model
initialModel = Card Spade 1



------------
-- UPDATE --
------------

type Msg
    = None

update : Msg -> Model -> Model
update msg model =
    model



----------
-- VIEW --
----------

view : Model -> Html Msg
view (Card suit rank) =
      text <| suitToString suit ++ String.fromInt rank
```
:::

### 5枚表示

ここまで表示できるようになったら，表示枚数を5枚に変更します．

以下の手順でやってみましょう．

1. 今までの1枚を表示する`view`関数は再利用できるので`cardView : Card -> Html Msg`に改名
2. `Model`を`{ hands : List Card }`に変更
3. `{ hands : List Card }`が引数にとる
新しい`view : Model -> Html Msg`を作成
4. とりさんの開発の様子を細部まで再現するために，やり切った顔でCOMPILEを押してエラーを出す
5. エラーメッセージを読み，「ご指摘の通りだよ」と言って直す

:::spoiler[3で詰まったときのヒント]
5枚もHtmlに変換するのは大変と思うかもしれませんが，1枚変換する関数は既にあります．
そして`List`にはまとめて変換するのに丁度良い関数があります．

変換後の型が`List`で，1つのHtmlになっていませんが，Htmlの各要素は子要素を持てます．
:::

:::spoiler[実装例]
```elm
module Main exposing (main)

import Browser
import Html exposing (Html, div, text)


main =
    Browser.sandbox
        { init = initialModel
        , view = view
        , update = update
        }



-----------
-- MODEL --
-----------

type alias Model =
    { hands : List Card
    }

type Card = Card Suit Rank

type Suit
    = Spade
    | Heart
    | Diamond
    | Club

suitToString suit =
    case suit of
        Spade -> "♠"
        Heart -> "♥"
        Diamond -> "♦"
        Club -> "♣"

type alias Rank = Int

initialModel : Model
initialModel = { hands = List.repeat 5 (Card Spade 1) }



------------
-- UPDATE --
------------

type Msg
    = None

update : Msg -> Model -> Model
update msg model =
    model



----------
-- VIEW --
----------

view : Model -> Html Msg
view { hands } =
    hands
        |> List.map cardView
        |> div []

cardView : Card -> Html Msg
cardView (Card suit rank) =
    text <| suitToString suit ++ String.fromInt rank
```
:::



## 開発ループを回す

これで出発点ができました．SAVEを押してリンクをツイートしたり，コードのバックアップをとるのに良いタイミングです．

ここからは「コード変更→動作確認」を繰り返して開発します．

- 手札のカードを捨てる
- 手札の見た目を改善
- 山札の作成
- 手札に役が成立しているか判定

ここから手分けして実装をはじめられるくらいの良い出発点ですが，勉強会なので1つずつ順番にやっていきます．



## カードを捨てる

カードを捨てられるようにしましょう．

今回は選んで一括で捨てられるように，選択する，捨てるの2メッセージにします．

### チェックボックスの表示

HTMLには[チェックボックス](https://developer.mozilla.org/ja/docs/Web/HTML/Reference/Elements/input/checkbox)という丁度良いUIがあります．データの送信はしないので`<form>`は使わず，`<input>`と`<label>`で良いでしょう．

```html
<label>
    <input type="checkbox" />
    ♠1
</label>
```

上記のようなHTMLを手札毎に作れば良いわけです．

Elmにも`Html.input`と`Html.label`があるので，それで動くか確かめます．一時的に`view`を書き換えます．

```elm
import Html exposing (..)
import Html.Attributes as Attr

...

view : Model -> Html Msg
view { hands } =
-- hands
--     |> List.map cardView
--     |> div []
--
    label []
        [ input [ Attr.type_ "checkbox" ] []
        , text "♠1"
        ]
```

`type`はキーワードなので，`Html.Attributes.type_`とアンダースコアが付きます．

それっぽいUIが出ることを確認したら，このコードを本来のカードの可視化部分である`cardView`に組み込んで，`view`は戻します．

```elm
view : Model -> Html Msg
view { hands } =
    hands
        |> List.map cardView
        |> div []

cardView : Card -> Html Msg
cardView (Card suit rank) =
    let
        str = suitToString suit ++ String.fromInt rank
    in
        label []
            [ input [ Attr.type_ "checkbox" ] []
            , text str
            ]
```

文字列部分に`str`と名前を付けてletでくっ付ければOKです．

### メッセージの作成

見た目はできましたが，このままではElm側でどのカードがチェックされたか分からないので，メッセージを送るようにしましょう．

`Html.Events`の`onCheck : (Bool -> msg) -> Attribute msg`という関数があるのでこれを使います．チェックボックスの状態が変化するときにメッセージを送るやつです．

**Eventの送り方に悩んだらサンプルのonClickを思い出す**
```elm
button [ onClick Increment ] [ text "+1" ]
```

`onClick : msg -> Html.Attribute msg`と同様に属性を作るのですが，こちらは引数に`Bool -> msg`を要求します．チェックが入っているかを`Bool`で受け取って`msg`を返す関数（を受け取って属性を返す関数）です．

送るメッセージは色々考えられますが，今回はn枚目のカードの選択/非選択を設定する，`Select Int Bool`というメッセージを追加します．`Select 0 True`であれば0枚目を選択状態にするメッセージです．

```elm
type Msg
    = Select Int Bool
```

属性は`onCheck <| Select n`と書けます．カスタム型を定義したときに`Select : Int -> Bool -> Msg`という関数が自動で生えたからです．それを`Select n : Bool -> Msg`で部分適用風味に書いています．（慣れない内は`onCheck <| \check -> Select n check`と書いても良いです）

さて，属性は書けるのですがそのまま組込むと…

```elm
cardView : Card -> Html Msg
cardView (Card suit rank) =
    let
        str = suitToString suit ++ String.fromInt rank
    in
        label []
            [ input
                [ Attr.type_ "checkbox"
                , onCheck <| Select n  -- nって何？
                ] []
            , text str
            ]
```

現在の`cardView`では何枚目の手札か分からないので，nが参照できません．

引数を増やします．

```elm
cardView : Int -> Card -> Html Msg
cardView n (Card suit rank) =  -- 第1引数に何枚目のカードかを追加
    let
        str = suitToString suit ++ String.fromInt rank
    in
        label []
            [ input
                [ Attr.type_ "checkbox"
                , onCheck <| Select n
                ] []
            , text str
            ]
```

第1引数に枚数の情報を入れたのは，理由があります．
`view`で使っている`List.map`にはバリエーションがあって，[`List.indexedMap`](https://package.elm-lang.org/packages/elm/core/latest/List#indexedMap)が，リストの何番目の要素かという情報を変換に使えて，今回の用途にマッチします．`indexedMap`がインデックスを第1引数と想定しているので，つなげやすいように合せたのです．

型を比較すると分かりやすいでしょう．

```
indexedMap : (Int -> a -> b) -> List a -> List b
map : (a -> b) -> List a -> List b
```

`map`は`map (\a -> b) list`のように利用し，`indexedMap`は`indexedMap (\idx a -> b) list`のように利用します．

`view`には綺麗にハマります．

```elm
view : Model -> Html Msg
view { hands } =
    hands
        |> List.indexedMap cardView
        |> div []
```

コンパイル出来たらEllieのDEBUGを使って，メッセージが正しく送られているか確認しましょう．

### Modelの更新

Msgは送られているので，Modelに反映しましょう．

シンプルに`selected : List Bool`に選択状態を保持するようにします．ついでに確定後の見た目に反映させるための`discarded : List Bool`も加えておきましょう．

```elm
type alias Model =
    { hands : List Card
    , selected : List Bool
    , discarded : List Bool
    }

...

initialModel : Model
initialModel =
    { hands = List.repeat 5 (Card Spade 1)
    , selected = List.repeat 5 False
    , discarded = List.repeat 5 False
    }
```

`Msg`は選択確定用に`Discard`を追加し，各分岐を埋めます．

```elm
type Msg
    = Select Int Bool
    | Discard

update : Msg -> Model -> Model
update msg model =
    case msg of
        Select n value ->
            ｛n番目のselectedを更新したmodel｝
        Discard ->
            ｛selectedをdiscardedに反映したmodel｝
```

selectedをdiscardedに反映するのは簡単なのでこちらから．

レコードの一部を変更するにはレコード更新式を使います．`model`の`discarded`を`model.selected`にするので`{ model | discarded = model.selected }`です．

n番目のselectedの更新も，レコード更新式の部分は同じです．こういう時はletを使って固まっている所から書きます．

```elm
Select n value ->
    let
        newSelected = ...
    in
        { model | selected = newSelected }
```

これで`model`の`selected`を`newSelected`にすることはできたので，改めて`...`部分を考えます．`model.selected : List Bool`のn番目を`value`で置き換えられればゴールです．

再帰関数を書くという解法もありますが，ここでは`List.indexedMap`を使い，`model.selected`を`n`番目のときだけ`value`にし，他を素通ししましょう．

```elm
newSelected =
    model.selected
        |> List.indexedMap (\idx a -> if idx == n then value else a)
```

リストのn番目を上書きする方法は，`update`に記述するにはやや詳細すぎるので，別の関数に切り出しておきます．概要と詳細を混ぜて書かないこと，粒度を合せるのは，Elmに限らずコードを書く上で大事です．

```elm
listUpdateAt : Int -> a -> List a -> List a
listUpdateAt n value list =
    list
        |> List.indexedMap (\idx a -> if idx == n then value else a)
```

（実は最後の引数`list`は式変形で取り除けるのですが，しばらくこのスタイルにします）

### 捨てたカード（仮）の表示

最後に，捨てたカード（仮）と確定ボタンを表示するように`viwe`を書き換えます．

捨てたカードを`List`から削除せずにフラグを追加した理由はいくつかあります．

- 最終的には「捨てる」というより「引き直す」処理で，そちらはまだ未実装
- 未完成でも動く様子が見れた方がモチベーションが続く
- 捨てなかったカードの位置は維持したい

というわけで，捨てたことにした表示と捨て札確定ボタンを付けます．
捨てたカードは，暫定的に「すてた」という表示にします．

「すてた」の分岐を入れる箇所はいくつか候補がありますが，仮置きなので影響の少ない位置を改造します．`cardView`のカードを受け取る箇所を，カードと捨てたかどうかの組を受け取るようにします．

…ところで，チェックボックスは選択されているかどうかを属性で持つ，ということを思い出しました．これも放り込むことにします．カード，選択されているか，捨てたかどうか，の3つ組です．（3要素なのでギリギリ許される）

```elm
cardView : Int -> ( Card, Bool, Bool ) -> Html Msg
cardView n ( (Card suit rank), selected, discarded ) =
    let
        str =
            if discarded then  -- 捨てたかどうか
                "すてた"
            else
                suitToString suit ++ String.fromInt rank
    in
        label []
            [ input
                [ Attr.type_ "checkbox"
                , Attr.checked selected  -- 選択中かどうか
                , onCheck <| Select n
                ] []
            , text str
            ]
```

`view`の`indexedMap`には`List Card`の代わりに`List ( Card, Bool, Bool )`を渡す必要があります．

複数のリストの同じインデックスの要素をまとめてる処理は，`List.map`のバリエーションである，[`map3 : (a -> b -> c -> result) -> List a -> List b -> List c -> List result`](https://package.elm-lang.org/packages/elm/core/latest/List#map3)が使えます．3つのリストのそれぞれの要素から新しい要素を作る関数，を引数に取ります．ここに`\a b c -> ( a, b, c )`を渡せば3つのリストを3タプルのリストにできるというわけです．要素数が合わない場合は最も少ないものに合せられます．ちなみに`map5`まであります．

後で消すかもしれませんが，3タプルのリストをつくる部分は独立しているので，`zip3`関数として切り出します．

捨て札確定ボタンも配置して，`view`は以下のようになります．

```elm
view : Model -> Html Msg
view { hands, selected, discarded } =
    let
        cards =
            zip3 hands selected discarded
                |> List.indexedMap cardView
                |> div []
    in
        div []
            [ cards
            , button [ onClick Discard ] [ text "すてる" ]
            ]

cardView : Int -> ( Card, Bool, Bool ) -> Html Msg
cardView n ( (Card suit rank), selected, discarded ) =
    let
        str =
            if discarded then
                "すてた"
            else
                suitToString suit ++ String.fromInt rank
    in
        label []
            [ input
                [ Attr.type_ "checkbox"
                , Attr.checked selected
                , onCheck <| Select n
                ] []
            , text str
            ]

zip3 : List a -> List b -> List c -> List ( a, b, c )
zip3 listA listB listC =
    List.map3 (\a b c -> ( a, b, c )) listA listB listC
```

:::details[コード全体]
```elm
module Main exposing (main)

import Browser
import Html exposing (..)
import Html.Attributes as Attr
import Html.Events exposing (onCheck, onClick)


main =
    Browser.sandbox
        { init = initialModel
        , view = view
        , update = update
        }



-----------
-- MODEL --
-----------

type alias Model =
    { hands : List Card
    , selected : List Bool  -- 捨て札として選択中
    , discarded : List Bool  -- 捨てた（仮置き）
    }

type Card = Card Suit Rank

type Suit
    = Spade
    | Heart
    | Diamond
    | Club

suitToString suit =
    case suit of
        Spade -> "♠"
        Heart -> "♥"
        Diamond -> "♦"
        Club -> "♣"

type alias Rank = Int

initialModel : Model
initialModel =
    { hands = List.repeat 5 (Card Spade 1)
    , selected = List.repeat 5 False
    , discarded = List.repeat 5 False
    }



------------
-- UPDATE --
------------

type Msg
    = Select Int Bool
    | Discard

update : Msg -> Model -> Model
update msg model =
    case msg of
        Select n value ->
            let
                newSelected = 
                    model.selected
                        |> listUpdateAt n value
            in
                { model | selected = newSelected }
        Discard ->
            { model | discarded = model.selected }

listUpdateAt : Int -> a -> List a -> List a
listUpdateAt n value list =
    list
        |> List.indexedMap (\idx a -> if idx == n then value else a)



----------
-- VIEW --
----------

view : Model -> Html Msg
view { hands, selected, discarded } =
    let
        cards =
            zip3 hands selected discarded
                |> List.indexedMap cardView
                |> div []
    in
        div []
            [ cards
            , button [ onClick Discard ] [ text "すてる" ]
            ]

cardView : Int -> ( Card, Bool, Bool ) -> Html Msg
cardView n ( (Card suit rank), selected, discarded ) =
    let
        str =
            if discarded then
                "すてた"
            else
                suitToString suit ++ String.fromInt rank
    in
        label []
            [ input
                [ Attr.type_ "checkbox"
                , Attr.checked selected
                , onCheck <| Select n
                ] []
            , text str
            ]

zip3 : List a -> List b -> List c -> List ( a, b, c )
zip3 listA listB listC =
    List.map3 (\a b c -> ( a, b, c )) listA listB listC
```
:::

:::coffee-break[リスティングとメッセージ]
Elmでリストから要素を指定するメッセージを送る方法はいくつかあります．いくつかあるということは，それぞれメリット/デメリットがあるということです．

今回は位置も欲しいので，ナイーブにリストのインデックスを使いました．この方法は`update`だけを見ると，インデックスの意味が分かりづらかったり，他のインデックスと取り違えてもコンパイラは指摘してくれない，などの課題があります．

他のメッセージの作り方としては[ababup1192さんの記事](https://qiita.com/ababup1192/items/4d1537ed0bdc34c8415d)のような要素を送る方法があります．この方法なら，メッセージの意味は明快ですし，同じ型でなければコンパイル時に見つかります．

関数型らしい方法としては，現在のリストの特定の要素を編集するためのコンテキストを丸ごとクロージャにする，という過激な方法も考えられます．実装は置きますが，難しいので雰囲気だけわかれば大丈夫です．

```elm
type Edit a  -- ある箇所の編集方法の型
  = Replace a  -- 別の要素に置き換える
  | Delete  -- その要素を取り除く

type alias Context a =  -- 編集コンテキスト型
  Edit a -> List a  -- 編集方法を指定してリストを構築できる

withContexts : List a -> List ( a, Context a ) -- 編集コンテキストを作る
withContexts list =
  let
    go before rest =
      case rest of
        [] -> []
        x :: after ->
          let
            editor r =
              List.reverse before ++ (
                case r of
                  Replace v -> v :: after
                  Delete -> after
              )
          in
            ( x, editor ) :: go (x :: before) after
  in
    go [] list
```

このようにすると，以下のような編集コンテキストを作れます．

```
withContexts [A, B, C, D] =
  [ ( A, \r -> [] ++ r' ++ [B, C, D] )
  , ( B, \r -> [A] ++  r'  ++ [C, D] )
  , ( C, \r -> [A, B] ++  r'  ++ [D] )
  , ( D, \r -> [A, B, C] ++ r' ++ [] ) 
  ]
```

ここで`r'`は`r`が`Replace R`ととき`[R]`，`Delete`のとき`[]`です．

編集コンテキストを送れば，受け取った側はもう編集後のリストを得ることしかできないので，何も曖昧さはありません…が，Elm的な単純さ失われていますし，この方法が本当に必要になったら恐らくそのアプリはTEAの想定用途外です…
:::



## 手札の見た目を改善

動くようにはなってきましたが，いかんせん見た目がショボいです．

ElmはHTMLとCSSで簡単に見た目を整えられるので，活かしていきましょう．
HTML/CSSでのデザインはネット上に資産が多く，AIの回答精度も高いです．
画像はGIFを使えば簡易アニメーション，SVGを使えばElmから細かな制御が可能です．

今回はHTMLをCSSで装飾します．それでも簡易な3Dやアニメーションは付けられます．

### 枠をつける

とりあえず見栄えのために枠を付けましょう．

HTMLの見栄えを整えるにはCSSが便利です．
この入門ではCSSの細かい機能は解説しませんが，構造と名称がわからないと口頭での解説も難しいため，それだけ触れておきましょう．

**CSSの基本的な構造**
```
<セレクタ> {
    <プロパティ1>: <値1>;
    <プロパティ2>: <値2>;
    ...  
}
<他のセレクタ> {
    ...  
}
...
```

- {セレクタ/selector}: スタイルを適用するHTML要素 （タグ，クラスなど）
- {プロパティ/property}: 設定項目 （要素の大きさ，文字の色など）
- {値/value}: 設定値（18px，"Meiryo"など）

早くアプリを映えさせたいので，習うより慣れましょう．
今回は最も汎用的なクラスをベースにしたセレクタで指定します．

まずはカードの見た目を作るのでcardというクラスの見た目を書きます．

**カードのベースとなる枠**  
```css
.card {
    /* 形状指定可能に */
    display: block;
    /* 形状 */
    width: 84px;
    height: 119px;
    /* 色 */
    background-color: white;
    border: 1px solid black;
}
```

カードの元となる四角い枠を表したものです．
これをEllieの左下のHTMLのstyleタグの中にコピーして使うのですが，コンパイルしてもまだ反映されません．

ドットからはじまるセレクタはclass属性で指定するもので，class="card"という属性をHTML側で付けてやる必要があります．

というわけで，Elm側も変更します．
`label`に"card"というclassの属性を付けましょう．

```elm
cardView : Int -> ( Card, Bool, Bool ) -> Html Msg
cardView n ( (Card suit rank), selected, discarded ) =
    let
        str =
            if discarded then
                "すてた"
            else
                suitToString suit ++ String.fromInt rank
    in
        label [ Attr.class "card" ]  -- ここ
            [ input
                [ Attr.type_ "checkbox"
                , Attr.checked selected
                , onCheck <| Select n
                ] []
            , text str
            ]
```

コンパイルすれば縦に並んだ枠の中にチェックボックスが入っているハズです．

このままじゃショボいので，ありったけ飾り付けていきましょう．
例えば，`border-radius: 8px;`を追加したら枠の角が丸まります．

さらに「チェックボックス」のチェック部分を消し，代わりに「選択されているカード」の背景色を変えます．

```css
.card {
    /* 形状指定可能に */
    display: block;
    /* 形状 */
    width: 89px;
    height: 119px;
    border-radius: 8px;
    /* 色 */
    background-color: white;
    border: 1px solid black;
    /* 文字を選択しないように */
    user-select: none;
}
.card input[type="checkbox"] {
    /* chekbox本体を消す */
    display: none;
}
.card:has(input:checked) {
    /* 選択中の色 */
    background-color: lightgray;
}
```

追加された2つのセレクタがそれぞれ対応します．`.card input[type="checkbox"]`は「cardクラスの子孫で，属性にtype="checkbox"をもつinput要素」を，`.card:has(input:checked)`は「checkedなinputを持つ要素cardクラス」をそれぞれ指定しています．

Mozillaが[セレクタの入門ページ](https://developer.mozilla.org/ja/docs/Learn_web_development/Core/Styling_basics/Basic_selectors)を日本語で出しているので
，詳しく知りたい方は参照してください．

さて，上記をコピーするとどうでしょうか．ちょっと見栄えがして来たでしょう？

中の呪文を作るときはLLMに聞くのが早いです．
目印になりそうな箇所にclass属性で名前を付けて，コンパイルして，開発者モードでHTMLをコピーしたら，「checkboxが選択中のときcardを暗くするcssを出して」と言えば恐らく出てきます．

### 横に並べ直す

これもCSSでやるのですが，歴史的経緯でいくつも方法があります．
縦横に並べるには[Flexbox](https://developer.mozilla.org/ja/docs/Web/CSS/Guides/Flexible_box_layout/Basic_concepts)が便利なので今回はそれでやりましょう．

並べるには入れ物の役割が必要なので，`card`をまとめる`div`に"card-list"と付けましょう．

```elm
view : Model -> Html Msg
view { hands, selected, discarded } =
    let
        cards =
            zip3 hands selected discarded
                |> List.indexedMap cardView  -- divを外した
    in
        div []
            [ div [ Attr.class "card-list" ] cards  -- ここに移動
            , button [ onClick Discard ] [ text "すてる" ]
            ]
```

class属性を付けたかったので，見易いように`cards`を`List (Html Msg)`にしました．

CSSにflexboxの横並びを追加します．

```css
.card-list {
    /* 入れ物にする */
    display: flex;
    /* 要素ごとの隙間 */
    gap: 10px;
}
.card {
    ...
    flex-shrink: 0; /* 自動で縮まないように */
}
```

styleタグに書き加えてCOMPILEしましょう．

### スートとランクを中央に重ねる

中央に大きなスートを薄く描いて，その上にランクを重ねたらもっと見栄えがしそうです．

まずはCSSから選択できるようにスートとランクを別の要素にしてclassを付けます．

```elm
cardView : Int -> ( Card, Bool, Bool ) -> Html Msg
cardView n ( (Card suit rank), selected, discarded ) =
    let
        center =
            if discarded then
                [ span [] [ text <| "すてた" ] ]
            else
                [ span [ Attr.class "suit" ] [ text <| suitToString suit ]
                , span [ Attr.class "rank" ] [ text <| String.fromInt rank ]
                ]
    in
        label [ Attr.class "card" ]
            [ input
                [ Attr.type_ "checkbox"
                , Attr.checked selected
                , onCheck <| Select n
                ] []
            , div [ Attr.class "card-center" ] center
            ]
```

spanはインラインの汎用タグです．divに似ていますがブロックではないです．
文中に置けるような，しかし区別はしたい範囲がspanです．

divとの使い分けは，今回は絵を描いているのでそんなに気にしなくても良いです．

CSSは今回入れ子表記（「○○の子孫の～」に対応）にしてみました．

```CSS
.card {
    ...
    /* 子要素の基準位置 */
    position: relative;
}
.card-center {
    /* 中央に */
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    justify-content: center;
    align-items: center;
    /* フォント */
    font-family: "Times New Roman";

    .suit {
        font-size: 100px;
        color: darkgray;
        transform: translate( 0, -5%);
    }

    .rank {
        position: absolute;
        font-size: 60px;
    }
}
```

文字を並べただけの見た目からはずいぶん良くなったのではないでしょうか．

### カードめくりアニメーション

カードをめくるアニメーションがあったらちょっとかっこいいですよね．
ちょっとした3DアニメーションならCSSだけで可能です．

```css
@keyframes flipAnimation {
      from { transform: rotateY(180deg); }
      to   { transform: rotateY(  0deg); }
}
.card {
    ...
    /* 3Dアニメーション */
    transform-style: preserve-3d;
    transform: rotateY(180deg);
    animation: flipAnimation 600ms ease forwards;
}
.card-center {
    /* 裏面の描画をしない */
    backface-visibility: hidden;
}
```

詳しくは説明しませんが，`@keyframe`で変化させたいプロパティの始点と終点に名前をつけ，`animation`プロパティでその名前を指定して適用します．時間や緩急，繰り返しなども簡単です．

これだけで動くはずです．

ついでに，皆さん大好きな時間差も入れましょう．

```css
.card:nth-child(1) { animation-delay:  400ms; }
.card:nth-child(2) { animation-delay:  600ms; }
.card:nth-child(3) { animation-delay:  800ms; }
.card:nth-child(4) { animation-delay: 1000ms; }
.card:nth-child(5) { animation-delay: 1200ms; }
```

`nth-child`はn番目の子要素であるときにそれを指定できます．
nを束縛できないので，地道に5枚それぞれ指定して，アニメーションの開始時間を遅らせています．

かなりいい感じになってきましたね．
フォントやアニメーションの微調整も楽しいですが，そろそろ「すてた」標示も気になるので，elmプログラミングに戻りましょう．

:::details[カードめくりアニメーションまでのコード]
```elm
module Main exposing (main)

import Browser
import Html exposing (..)
import Html.Attributes as Attr
import Html.Events exposing (onCheck, onClick)


main =
    Browser.sandbox
        { init = initialModel
        , view = view
        , update = update
        }



-----------
-- MODEL --
-----------

type alias Model =
    { hands : List Card
    , selected : List Bool  -- 捨て札として選択中
    , discarded : List Bool  -- 捨てた（仮置き）
    }

type Card = Card Suit Rank

type Suit
    = Spade
    | Heart
    | Diamond
    | Club

suitToString suit =
    case suit of
        Spade -> "♠"
        Heart -> "♥"
        Diamond -> "♦"
        Club -> "♣"

type alias Rank = Int

initialModel : Model
initialModel =
    { hands = List.repeat 5 (Card Spade 1)
    , selected = List.repeat 5 False
    , discarded = List.repeat 5 False
    }



------------
-- UPDATE --
------------

type Msg
    = Select Int Bool
    | Discard

update : Msg -> Model -> Model
update msg model =
    case msg of
        Select n value ->
            let
                newSelected = 
                    model.selected
                        |> listUpdateAt n value
            in
                { model | selected = newSelected }
        Discard ->
            { model | discarded = model.selected }

listUpdateAt : Int -> a -> List a -> List a
listUpdateAt n value list =
    list
        |> List.indexedMap (\idx a -> if idx == n then value else a)



----------
-- VIEW --
----------

view : Model -> Html Msg
view { hands, selected, discarded } =
    let
        cards =
            zip3 hands selected discarded
                |> List.indexedMap cardView
    in
        div []
            [ div [ Attr.class "card-list" ] cards
            , button [ onClick Discard ] [ text "すてる" ]
            ]

cardView : Int -> ( Card, Bool, Bool ) -> Html Msg
cardView n ( (Card suit rank), selected, discarded ) =
    let
        center =
            if discarded then
                [ span [] [ text <| "すてた" ] ]
            else
                [ span [ Attr.class "suit" ] [ text <| suitToString suit ]
                , span [ Attr.class "rank" ] [ text <| String.fromInt rank ]
                ]
    in
        label [ Attr.class "card" ]
            [ input
                [ Attr.type_ "checkbox"
                , Attr.checked selected
                , onCheck <| Select n
                ] []
            , div [ Attr.class "card-center" ] center
            ]

zip3 : List a -> List b -> List c -> List ( a, b, c )
zip3 listA listB listC =
    List.map3 (\a b c -> ( a, b, c )) listA listB listC
```

```css
@keyframes flipAnimation {
      from { transform: rotateY(180deg); }
      to   { transform: rotateY(  0deg); }
}
.card-list {
    /* 入れ物にする */
    display: flex;
    /* 要素ごとの隙間 */
    gap: 10px;
}
.card {
    /* 形状指定可能に */
    display: block;
    /* 形状 */
    width: 89px;
    height: 119px;
    border-radius: 8px;
    /* 色 */
    background-color: white;
    border: 1px solid black;
    /* 子要素の基準位置 */
    position: relative;
    /* 文字を選択しないように */
    user-select: none;
    /* 自動で縮むのを防止 */
    flex-shrink: 0;
    /* 3Dアニメーション */
      transform-style: preserve-3d;
    transform: rotateY(180deg);  /* 基本裏向き*/
    animation: flipAnimation 600ms ease forwards;

    /* 中のchekbox */
    input[type="checkbox"] {
        /* chekbox本体を消す */
        display: none;
    }
}
.card-center {
    /* 中央に */
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    justify-content: center;
    align-items: center;
    /* フォント */
    font-family: "Times New Roman";
    /* 裏面の描画をしない */
    backface-visibility: hidden;

    .suit {
        font-size: 100px;
        color: darkgray;
        transform: translate( 0, -5%);
    }

    .rank {
        position: absolute;
        font-size: 60px;
    }
}
.card:has(input:checked) {
    /* 選択中の色 */
    background-color: lightgray;
}
.card:nth-child(1) { animation-delay:  400ms; }
.card:nth-child(2) { animation-delay:  600ms; }
.card:nth-child(3) { animation-delay:  800ms; }
.card:nth-child(4) { animation-delay: 1000ms; }
.card:nth-child(5) { animation-delay: 1200ms; }
```
:::

:::coffee-break[Htmlのスタイル指定]
ElmのHtmlにスタイルを指定する方法には，これまでやったCSSの他にもうひとつ，
直接style属性を付けるというのがあります．コード上で直接`Attribute.style "background-color" "red"`のような属性を書けば，
それがHTMLに反映されるため，CSSに依らずにスタイルを指定できます．

この方法はElmから直接操作できるため柔軟な指定が可能な一方，
制御するためのコードが煩雑になりがちです．
基本的には，CSSにした方が整理されたコードを書きやすいでしょう．

指定するスタイルが少なかったり，別にCSSファイルを作りたくないような場合は，直接のスタイル指定も覚えておくとよいかもしれません．
:::